import { ACCOUNT_RE, MIRROR } from "./hedera";

export type NftReceiveState = { accountId: string; unlimited: boolean; freeSlots: number; receiverSignature: boolean; associated: boolean };

/** Resolve the numbered mainnet account, never an EVM alias, before a sender uses it. */
export async function getNftReceiveState(accountId: string, tokenId?: string): Promise<NftReceiveState> {
  if (!ACCOUNT_RE.test(accountId) || (tokenId !== undefined && !ACCOUNT_RE.test(tokenId))) throw new Error("NFT receiving: use a mainnet account or collection ID like 0.0.123456.");
  const read = async (path: string) => {
    const r = await fetch(`${MIRROR}/api/v1/${path}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (r.status === 404) throw new Error("NFT receiving: account or collection not found on mainnet.");
    if (!r.ok) throw new Error("NFT mirror: receiving settings unavailable. Try again.");
    return r.json();
  };
  const [account, collection, associations] = await Promise.all([
    read(`accounts/${accountId}`),
    tokenId ? read(`tokens/${tokenId}`) : null,
    tokenId ? read(`accounts/${accountId}/tokens?token.id=${tokenId}&limit=1`) : null,
  ]);
  if (account.account !== accountId || account.deleted) throw new Error("NFT receiving: this mainnet account is not active.");
  if (collection && (collection.type !== "NON_FUNGIBLE_UNIQUE" || collection.deleted)) throw new Error("NFT receiving: enter an active NFT collection ID, not a fungible token or serial number.");
  if (collection?.pause_status === "PAUSED") throw new Error("NFT receiving: this collection is paused.");
  const association = associations?.tokens?.find((row: { token_id: string }) => row.token_id === tokenId);
  if (association?.freeze_status === "FROZEN") throw new Error("NFT receiving: this collection has frozen your account.");
  if (association?.kyc_status === "REVOKED") throw new Error("NFT receiving: the collection issuer must grant your account KYC.");
  const maximum = Number(account.max_automatic_token_associations ?? 0);
  const used = Number(account.used_automatic_token_associations ?? 0);
  return { accountId, unlimited: maximum === -1, freeSlots: Number.isFinite(maximum) && Number.isFinite(used) ? Math.max(0, maximum - used) : 0, receiverSignature: account.receiver_sig_required === true, associated: Boolean(association) };
}

export async function checkNftAssociation(accountId: string, tokenId: string) {
  const state = await getNftReceiveState(accountId, tokenId);
  if (state.associated) throw new Error("NFT association: this collection is already associated.");
  return state;
}