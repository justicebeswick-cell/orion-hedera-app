// Browser-only. Orion acting as a WalletConnect v2 wallet for Hedera mainnet dApps.
import type { Wallet as HederaWeb3Wallet } from "@hashgraph/hedera-wallet-connect";
import { WC_PROJECT_ID } from "./walletconnect";
import { readKeystoreMeta, unlockKeystore } from "./keystore";

export type Proposal = { kind: "proposal"; id: number; name: string; url: string; icon?: string; methods: string[]; raw: any };
export type Req = { kind: "request"; id: number; topic: string; dapp: string; method: string; lines: string[]; raw: any };
export type Session = { topic: string; name: string; url: string; icon?: string };
export type State = { ready: boolean; error: string; pending: (Proposal | Req)[]; sessions: Session[] };

let state: State = { ready: false, error: "", pending: [], sessions: [] };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const snapshot = () => state;

let wallet: HederaWeb3Wallet | null = null;
let init: Promise<HederaWeb3Wallet> | null = null;

function refreshSessions() {
  if (!wallet) return;
  set({ sessions: Object.values(wallet.getActiveSessions()).map((s: any) => ({ topic: s.topic, name: s.peer.metadata.name, url: s.peer.metadata.url, icon: s.peer.metadata.icons?.[0] })) });
}

function describe(body: any, method: string): string[] {
  if (!body) return [method.replace("hedera_", "")];
  if (typeof body === "string") return ["Sign a message:", body.length > 200 ? body.slice(0, 200) + "…" : body];
  if (body instanceof Uint8Array) return ["Sign transaction bytes (not submitted by Orion)"];
  const name = body.constructor?.name?.replace("Transaction", "") ?? "Transaction";
  const out = [`Action: ${name}`];
  try {
    const t = body.hbarTransfers; if (t?.size) t.forEach((v: any, k: any) => out.push(`${k.toString()}: ${v.toString()}`));
    if (body.contractId) out.push(`Contract: ${body.contractId.toString()}`);
    if (body.gas) out.push(`Gas limit: ${body.gas.toString()}`);
    if (body.payableAmount && !body.payableAmount.isZero?.()) out.push(`Pays: ${body.payableAmount.toString()}`);
    if (body.tokenIds?.length) out.push(`Tokens: ${body.tokenIds.map((x: any) => x.toString()).join(", ")}`);
    if (body.maxTransactionFee) out.push(`Max network fee: ${body.maxTransactionFee.toString()}`);
    if (body.transactionMemo) out.push(`Memo: ${body.transactionMemo}`);
  } catch { /* best-effort summary */ }
  return out;
}

export async function startWallet() {
  if (!WC_PROJECT_ID) { set({ error: "WalletConnect is not configured" }); throw new Error("WalletConnect is not configured"); }
  if (wallet) return wallet;
  init ??= (async () => {
    const wc = await import("@hashgraph/hedera-wallet-connect");
    const w = await wc.Wallet.create(WC_PROJECT_ID, {
      name: "Orion", description: "A Hashgraph Wallet", url: window.location.origin, icons: [`${window.location.origin}/icon-192-v26.png`],
    }, [wc.HederaChainId.Mainnet]);
    w.on("session_proposal", (p: any) => {
      const m = p.params.proposer.metadata;
      const ns = { ...p.params.requiredNamespaces, ...p.params.optionalNamespaces };
      const methods = Object.values(ns).flatMap((n: any) => n.methods ?? []);
      set({ pending: [...state.pending, { kind: "proposal", id: p.id, name: m.name, url: m.url, icon: m.icons?.[0], methods, raw: p }] });
    });
    w.on("session_request", (e: any) => {
      try {
        const parsed = w.parseSessionRequest(e);
        const s = w.getActiveSessions()[e.topic];
        set({ pending: [...state.pending, { kind: "request", id: e.id, topic: e.topic, dapp: s?.peer.metadata.name ?? "dApp", method: parsed.method, lines: describe(parsed.body, parsed.method), raw: e }] });
      } catch (err) { void w.rejectSessionRequest(e, { code: 5100, message: (err as Error).message }); }
    });
    w.on("session_delete", refreshSessions);
    wallet = w; refreshSessions(); set({ ready: true, error: "" });
    return w;
  })();
  return init;
}

const drop = (id: number) => set({ pending: state.pending.filter((p) => p.id !== id) });

export async function pair(uri: string) {
  if (!/^wc:[0-9a-f]+@2\?/i.test(uri.trim())) throw new Error("Not a WalletConnect v2 link");
  const w = await startWallet();
  await w.core.pairing.pair({ uri: uri.trim() });
}

export async function approveProposal(p: Proposal, accountId: string) {
  const w = await startWallet();
  await w.buildAndApproveSession([`hedera:mainnet:${accountId}`], p.raw);
  drop(p.id); refreshSessions();
}
export async function rejectProposal(p: Proposal) {
  const w = await startWallet();
  await w.rejectSession({ id: p.id, reason: { code: 5000, message: "User rejected" } });
  drop(p.id);
}

export async function approveRequest(r: Req, accountId: string, passphrase: string) {
  const w = await startWallet();
  const meta = readKeystoreMeta();
  if (!meta || meta.accountId !== accountId) throw new Error("Signing failed: no device key for this account");
  let raw: string;
  try { raw = await unlockKeystore(passphrase); } catch { throw new Error("Device key did not unlock. Check the code."); }
  const wc = await import("@hashgraph/hedera-wallet-connect");
  const sdk = await import("@hiero-ledger/sdk");
  const key = meta.kind === "ed25519" ? sdk.PrivateKey.fromStringED25519(raw) : sdk.PrivateKey.fromStringECDSA(raw);
  const signer = w.getHederaWallet(wc.HederaChainId.Mainnet, accountId, key.toStringDer());
  await w.executeSessionRequest(r.raw, signer);
  drop(r.id);
}
export async function rejectRequest(r: Req) {
  const w = await startWallet();
  await w.rejectSessionRequest(r.raw, { code: 5000, message: "User rejected" });
  drop(r.id);
}

export async function disconnect(topic: string) {
  const w = await startWallet();
  await w.disconnectSession({ topic, reason: { code: 6000, message: "User disconnected" } });
  refreshSessions();
}

const BM = "orion.bookmarks";
export const DEFAULT_BOOKMARKS = [
  { name: "SaucerSwap", url: "https://www.saucerswap.finance" },
  { name: "SentX", url: "https://sentx.io" },
  { name: "Kabila", url: "https://market.kabila.app" },
  { name: "Stader", url: "https://hedera.staderlabs.com" },
  { name: "HashScan", url: "https://hashscan.io/mainnet" },
];
export function readBookmarks(): { name: string; url: string }[] {
  try { return JSON.parse(localStorage.getItem(BM) ?? "null") ?? DEFAULT_BOOKMARKS; } catch { return DEFAULT_BOOKMARKS; }
}
export function saveBookmarks(b: { name: string; url: string }[]) { localStorage.setItem(BM, JSON.stringify(b)); }
