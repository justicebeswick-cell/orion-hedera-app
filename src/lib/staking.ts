import { MIRROR } from "./hedera";
import { readKeystoreMeta, unlockKeystore } from "./keystore";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(MIRROR + path).catch(() => { throw new Error("Hedera unreachable"); });
  if (!r.ok) throw new Error(`Mirror node returned ${r.status}`);
  return r.json();
}

export type StakeInfo = {
  stakedNodeId: number | null;
  stakedAccountId: string | null;
  declineReward: boolean;
  pendingReward: number;
  stakePeriodStart: string | null;
  balance: number;
};

export async function getStakeInfo(id: string): Promise<StakeInfo> {
  const a = await get<any>(`/api/v1/accounts/${id}?limit=1`);
  return {
    stakedNodeId: a.staked_node_id ?? null,
    stakedAccountId: a.staked_account_id ?? null,
    declineReward: !!a.decline_reward,
    pendingReward: a.pending_reward ?? 0,
    stakePeriodStart: a.stake_period_start ?? null,
    balance: a.balance?.balance ?? 0,
  };
}

export type Reward = { amount: number; timestamp: string };
export async function getRewards(id: string): Promise<Reward[]> {
  const r = await get<{ rewards: Reward[] }>(`/api/v1/accounts/${id}/rewards?limit=25&order=desc`);
  return r.rewards;
}

export type Node = {
  node_id: number;
  description: string;
  stake: number;
  stake_rewarded: number;
  max_stake: number;
  reward_rate_start: number;
};
export async function getNodes(): Promise<Node[]> {
  const out: Node[] = [];
  let next: string | null = `/api/v1/network/nodes?limit=25&order=asc`;
  while (next) {
    const r: { nodes: Node[]; links: { next: string | null } } = await get(next);
    out.push(...r.nodes);
    next = r.links.next;
  }
  return out;
}

/** Approx annual reward rate from tinybar-per-hbar-per-day. */
export const apr = (n: Node) => ((n.reward_rate_start / 1e8) * 365 * 100).toFixed(2) + "%";

export const MAX_FEE_HBAR = 2;

/** Sign and submit an AccountUpdate setting the staked node. Returns transaction id. */
export async function redelegate(accountId: string, nodeId: number, passphrase: string) {
  const sdk = await import("@hashgraph/sdk");
  const { getWcSigner } = await import("./walletconnect");
  const signer = await getWcSigner(accountId);
  if (signer) {
    try {
      const tx = await new sdk.AccountUpdateTransaction()
        .setAccountId(accountId)
        .setStakedNodeId(nodeId)
        .setDeclineStakingReward(false)
        .setMaxTransactionFee(new sdk.Hbar(MAX_FEE_HBAR))
        .freezeWithSigner(signer);
      const resp = await tx.executeWithSigner(signer);
      return resp.transactionId.toString();
    } catch (e) {
      throw new Error(`Account update on mainnet failed: ${(e as Error).message ?? "rejected in wallet"}`);
    }
  }
  const meta = readKeystoreMeta();
  if (!meta || meta.accountId !== accountId) throw new Error("No key for this account on this device");
  const raw = await unlockKeystore(passphrase);
  const key = meta.kind === "ed25519" ? sdk.PrivateKey.fromStringED25519(raw) : sdk.PrivateKey.fromStringECDSA(raw);
  const client = sdk.Client.forMainnet().setOperator(accountId, key);
  try {
    const tx = await new sdk.AccountUpdateTransaction()
      .setAccountId(accountId)
      .setStakedNodeId(nodeId)
      .setDeclineStakingReward(false)
      .setMaxTransactionFee(new sdk.Hbar(MAX_FEE_HBAR))
      .freezeWith(client)
      .sign(key);
    const resp = await tx.execute(client);
    const receipt = await resp.getReceipt(client);
    if (receipt.status.toString() !== "SUCCESS") throw new Error(`Account update failed: ${receipt.status}`);
    return resp.transactionId.toString();
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/fetch|network|UNAVAILABLE/i.test(msg)) throw new Error("Hedera unreachable");
    throw new Error(`Account update on mainnet failed: ${msg}`);
  } finally {
    client.close();
  }
}

/** Poll the mirror node for consensus timestamp of a transaction id. */
export async function waitForConsensus(txId: string) {
  const [acct, rest] = txId.split("@");
  const mirrorId = `${acct}-${(rest ?? "").replace(".", "-")}`;
  for (let i = 0; i < 15; i++) {
    try {
      const r = await get<{ transactions: { consensus_timestamp: string; result: string }[] }>(
        `/api/v1/transactions/${mirrorId}`,
      );
      if (r.transactions?.[0]) return r.transactions[0];
    } catch { /* not indexed yet */ }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return null;
}
