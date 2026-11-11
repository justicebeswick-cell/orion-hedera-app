import { ACCOUNT_RE, MIRROR } from "./hedera";

export type PendingAirdrop = { sender_id: string; receiver_id: string; token_id: string; amount: number; serial_number: number | null; timestamp?: { from: string } };
export type TokenInfo = {
  token_id: string; name: string; symbol: string; decimals: string; type: "FUNGIBLE_COMMON" | "NON_FUNGIBLE_UNIQUE";
  treasury_account_id: string | null; pause_status?: string; pause_key: unknown; kyc_key: unknown; freeze_key: unknown; supply_key?: unknown; wipe_key?: unknown;
  custom_fees?: { royalty_fees?: { amount: { numerator: number; denominator: number }; collector_account_id: string; fallback_fee?: { amount: number; denominating_token_id: string | null } | null }[]; fixed_fees?: { amount: number; collector_account_id: string; denominating_token_id: string | null }[]; fractional_fees?: unknown[] };
};

/** Mirror: unclaimed HIP-904 airdrops waiting for this account. */
export async function getPendingAirdrops(account: string): Promise<PendingAirdrop[]> {
  if (!ACCOUNT_RE.test(account)) return [];
  const r = await fetch(`${MIRROR}/api/v1/accounts/${account}/airdrops/pending?limit=100`, { signal: AbortSignal.timeout(15000) });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error("Airdrop mirror: incoming tokens unavailable. Try again.");
  const body = await r.json();
  return (body.airdrops ?? []).filter((a: PendingAirdrop) => ACCOUNT_RE.test(a.token_id) && ACCOUNT_RE.test(a.sender_id) && a.receiver_id === account);
}

export async function getTokenInfo(tokenId: string): Promise<TokenInfo> {
  if (!ACCOUNT_RE.test(tokenId)) throw new Error("Token mirror: invalid token ID.");
  const r = await fetch(`${MIRROR}/api/v1/tokens/${tokenId}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Token mirror: token details unavailable.");
  return r.json();
}

/** Display amount in the token's own decimals. */
export function tokenAmount(units: number, decimals: string | number) {
  const d = Math.max(0, Math.min(18, Number(decimals) || 0));
  return units / 10 ** d;
}

/** Royalty fraction as a percent, e.g. {1,20} -> 5. */
export function royaltyPercent(f: { numerator: number; denominator: number }) {
  return f.denominator ? (f.numerator / f.denominator) * 100 : 0;
}

/** -1 means unlimited automatic associations (Hedera's "accept airdrops" setting). */
export function autoAssociateOn(max: number | null | undefined) { return max === -1; }
