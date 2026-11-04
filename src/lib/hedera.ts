import { fmtAmount } from "./display";

export const MIRROR = "https://mainnet-public.mirrornode.hedera.com";
export const HASHSCAN = "https://hashscan.io/mainnet";
export const TOPIC_MEMO = "aurion:v1";

export const ACCOUNT_RE = /^0\.0\.\d{1,10}$/;

export type Tx = {
  transaction_id: string;
  consensus_timestamp: string;
  name: string;
  result: string;
  memo_base64?: string;
  transfers?: { account: string; amount: number }[];
};

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(MIRROR + path);
  } catch {
    throw new Error("Hedera unreachable");
  }
  if (res.status === 404) throw new Error("Account does not resolve on mainnet");
  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
  return res.json();
}

export async function getAccount(id: string) {
  const a = await get<{
    account: string;
    balance: { balance: number; timestamp: string };
    staked_node_id: number | null;
    pending_reward: number | null;
  }>(`/api/v1/accounts/${id}?limit=1`);
  return {
    id: a.account,
    tinybar: a.balance.balance,
    asOf: a.balance.timestamp,
    stakedNode: a.staked_node_id ?? null,
    pendingReward: a.pending_reward ?? 0,
  };
}

/** Current HBAR price in USD from the network's own exchange rate. */
export async function hbarUsd(): Promise<number> {
  const r = await fetch(`${MIRROR}/api/v1/network/exchangerate`);
  if (!r.ok) throw new Error("Mirror node: exchange rate unavailable");
  const j = await r.json();
  return j.current_rate.cent_equivalent / j.current_rate.hbar_equivalent / 100;
}

/**
 * Live HBAR/USD spot price from the public market feed the price chart uses.
 * The network's own rate is only retuned about once an hour, so it can't
 * follow the market tick by tick.
 */
export async function hbarUsdSpot(): Promise<number> {
  const r = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=HBARUSDT", {
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error("Price feed unavailable");
  const j = (await r.json()) as { price?: string };
  const p = Number(j.price);
  if (!Number.isFinite(p) || p <= 0) throw new Error("Price feed returned no price");
  return p;
}

/** HBAR price in USD: live market price, falling back to the network's own rate. */
export async function hbarUsdLive(): Promise<number> {
  try {
    return await hbarUsdSpot();
  } catch {
    return hbarUsd();
  }
}

export async function getTransactions(id: string) {
  const r = await get<{ transactions: Tx[] }>(
    `/api/v1/transactions?account.id=${id}&limit=25&order=desc`,
  );
  return r.transactions;
}

/** Seconds the mirror node is behind wall clock. */
export async function getLag() {
  const r = await get<{ transactions: Tx[] }>(`/api/v1/transactions?limit=1&order=desc`);
  const ts = Number(r.transactions[0]?.consensus_timestamp ?? 0);
  return Date.now() / 1000 - ts;
}

export type TopicMsg = { consensus_timestamp: string; sequence_number: number; message: string };

export async function findHashInTopic(topicId: string, hash: string) {
  let next: string | null = `/api/v1/topics/${topicId}/messages?limit=100&order=asc`;
  while (next) {
    const r: { messages: TopicMsg[]; links: { next: string | null } } = await get(next);
    for (const m of r.messages) {
      try {
        const env = JSON.parse(atob(m.message));
        if (env.app === "aurion" && env.hash === hash) return m;
      } catch {
        /* non-aurion message */
      }
    }
    next = r.links.next;
  }
  return null;
}

export const hbar = (tinybar: number) => fmtAmount(tinybar / 1e8);

export const tsToDate = (ts: string) => new Date(Number(ts) * 1000);
export const fmtTs = (ts: string) => tsToDate(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";

export async function sha256Hex(data: ArrayBuffer | string) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function netAmount(tx: Tx, id: string) {
  return tx.transfers?.filter((t) => t.account === id).reduce((s, t) => s + t.amount, 0) ?? 0;
}

// Hedera's own type names are jargon. Say the plain word instead.
const TX_LABELS: Record<string, string> = {
  CRYPTOTRANSFER: "Transfer",
  TOKENTRANSFER: "Transfer",
  ETHEREUMTRANSACTION: "Transfer",
  TOKENASSOCIATE: "Add token",
  TOKENDISSOCIATE: "Remove token",
  TOKENMINT: "Mint",
  TOKENBURN: "Burn",
  TOKENCREATION: "Token created",
  TOKENUPDATE: "Token update",
  TOKENUPGRADE: "Token update",
  TOKENREJECT: "Token returned",
  SCHEDULECREATE: "Scheduled payment",
  SCHEDULEDELETE: "Cancelled payment",
  SCHEDULESIGN: "Approval",
  CONSENSUSCREATETOPIC: "Message log",
  CONSENSUSSUBMITMESSAGE: "Message",
  CRYPTOCREATEACCOUNT: "Account created",
  CRYPTOUPDATEACCOUNT: "Account update",
  CRYPTODELETE: "Account closed",
  CRYPTOAPPROVEALLOWANCE: "Allowance",
  CRYPTODELETEALLOWANCE: "Allowance removed",
  CONTRACTCREATETRANSACTION: "Contract",
  CONTRACTCALL: "Contract call",
  NODECREATE: "Node",
  NODEUPDATE: "Node",
  NODEDELETE: "Node",
  ATOMICBATCH: "Batch",
};

/** Plain-word label for a mirror-node transaction type. */
export function txLabel(name: string) {
  const key = name.toUpperCase().replace(/[^A-Z]/g, "");
  return TX_LABELS[key] ?? name.replace(/([A-Z])/g, " $1").trim().toLowerCase();
}
