// Portfolio value: HBAR plus every HTS token priced through its live SaucerSwap route.
import { MIRROR } from "./hedera";
import { HBAR, quote, type SwapToken } from "./swap";

export type HeldToken = {
  token_id: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  nft: boolean;
  /** What this holding is worth in HBAR right now, or null with no live market. */
  inHbar: number | null;
};

const metaCache = new Map<string, { symbol: string; name: string; decimals: number; nft: boolean }>();

async function tokenMeta(tokenId: string) {
  const cached = metaCache.get(tokenId);
  if (cached) return cached;
  const r = await fetch(`${MIRROR}/api/v1/tokens/${tokenId}`).catch(() => null);
  const j = r && r.ok ? await r.json() : {};
  const meta = {
    symbol: j.symbol ?? tokenId,
    name: j.name ?? "",
    decimals: Number(j.decimals ?? 0),
    nft: j.type === "NON_FUNGIBLE_UNIQUE",
  };
  metaCache.set(tokenId, meta);
  return meta;
}

/** Every token the account holds, each priced in HBAR where a market exists. */
export async function heldTokens(accountId: string): Promise<HeldToken[]> {
  const r = await fetch(`${MIRROR}/api/v1/accounts/${accountId}/tokens?limit=100`).catch(() => null);
  if (!r || !r.ok) throw new Error(`Mirror node returned ${r ? r.status : "no response"}`);
  const j = await r.json() as { tokens?: { token_id: string; balance: number }[] };
  const rows = (j.tokens ?? []).filter((t) => t.balance > 0);
  return Promise.all(rows.map(async (row) => {
    const meta = await tokenMeta(row.token_id);
    let inHbar: number | null = null;
    if (!meta.nft) {
      const tok: SwapToken = { id: row.token_id, symbol: meta.symbol, name: meta.name, decimals: meta.decimals };
      try { inHbar = Number((await quote(tok, HBAR, BigInt(row.balance))).out) / 1e8; } catch { inHbar = null; }
    }
    return { token_id: row.token_id, symbol: meta.symbol, name: meta.name, decimals: meta.decimals, balance: row.balance, nft: meta.nft, inHbar };
  }));
}

/** HBAR plus every priced token, or null while the HBAR balance is still unknown. */
export function totalInHbar(hbarBalance: number | null, rows: { inHbar: number | null }[]): number | null {
  if (hbarBalance === null) return null;
  return rows.reduce((sum, row) => sum + (row.inHbar ?? 0), hbarBalance);
}
