import { ACCOUNT_RE, MIRROR } from "./hedera";
import { readBlocklist } from "./guard";

export type Nft = { token_id: string; serial_number: number; account_id: string; metadata: string };
export type NftPage = { nfts: Nft[]; links: { next: string | null } };

export async function getNfts(account: string, next?: string): Promise<NftPage> {
  const url = next ? new URL(next, MIRROR) : new URL(`/api/v1/accounts/${account}/nfts?limit=24&order=desc`, MIRROR);
  if (url.origin !== MIRROR || !url.pathname.startsWith(`/api/v1/accounts/${account}/nfts`)) throw new Error("NFT mirror: invalid page.");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("NFT mirror: collection unavailable. Try again.");
  return response.json();
}

/** Only public HTTPS media; NFT metadata must never run as HTML or script. */
export function nftUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  const source = value.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${value.slice(7).replace(/^ipfs\//, "")}` : value;
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".localhost") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url.href;
  } catch { return null; }
}

export async function getNftMetadata(nft: Nft): Promise<{ name: string; description: string; image: string | null }> {
  const fallback = { name: `${nft.token_id} #${nft.serial_number}`, description: "", image: null };
  try {
    const decoded = atob(nft.metadata).trim();
    const url = nftUrl(decoded);
    const response = url ? await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(10000) }) : null;
    if (response && !response.ok) return fallback;
    const text = response ? await response.text() : decoded;
    if (text.length > 1_000_000) return fallback;
    const metadata = JSON.parse(text);
    return { name: typeof metadata.name === "string" ? metadata.name.slice(0, 200) : fallback.name, description: typeof metadata.description === "string" ? metadata.description.slice(0, 2000) : "", image: nftUrl(metadata.image) };
  } catch { return fallback; }
}

export async function preflightNft(from: string, to: string, token: string, serial: number) {
  if (!ACCOUNT_RE.test(from) || !ACCOUNT_RE.test(to) || !ACCOUNT_RE.test(token) || !Number.isSafeInteger(serial) || serial < 1) throw new Error("NFT transfer: invalid account or NFT.");
  if (from === to) throw new Error("Recipient check: cannot send to yourself.");
  if (readBlocklist().includes(to)) throw new Error("Recipient check: account is on your blocked list.");
  const read = async (path: string) => {
    const response = await fetch(`${MIRROR}/api/v1/${path}`, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404) throw new Error("NFT transfer: account or NFT not found on mainnet.");
    if (!response.ok) throw new Error("NFT mirror: verification unavailable. Try again.");
    return response.json();
  };
  const [nft, recipient, collection, associations] = await Promise.all([
    read(`tokens/${token}/nfts/${serial}`), read(`accounts/${to}`), read(`tokens/${token}`), read(`accounts/${to}/tokens?token.id=${token}&limit=1`),
  ]);
  if (nft.account_id !== from || nft.deleted) throw new Error("NFT ownership: this wallet no longer owns this NFT.");
  if (collection.type !== "NON_FUNGIBLE_UNIQUE" || collection.deleted) throw new Error("NFT transfer: collection is not active.");
  if (recipient.deleted) throw new Error("Recipient check: account is deleted.");
  if (recipient.receiver_sig_required) throw new Error("Recipient check: this account must co-sign. Not supported.");
  const association = associations.tokens?.find((row: { token_id: string }) => row.token_id === token);
  if (association?.freeze_status === "FROZEN" || association?.kyc_status === "REVOKED") throw new Error("NFT transfer: recipient's token association is frozen or lacks KYC.");
  if (!association && recipient.max_automatic_token_associations !== -1 && Number(recipient.max_automatic_token_associations ?? 0) <= Number(recipient.used_automatic_token_associations ?? 0)) throw new Error("NFT association: recipient must add this collection before receiving it.");
}