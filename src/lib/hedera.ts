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
  const a = await get<{ account: string; balance: { balance: number; timestamp: string } }>(
    `/api/v1/accounts/${id}?limit=1`,
  );
  return { id: a.account, tinybar: a.balance.balance, asOf: a.balance.timestamp };
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

export const hbar = (tinybar: number) =>
  (tinybar / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });

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
