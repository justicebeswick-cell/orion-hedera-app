// Browser-only. HashPack and Blade via WalletConnect on Hedera mainnet.
import type { DAppConnector, DAppSigner } from "@hashgraph/hedera-wallet-connect";

// Reown project IDs are public identifiers, not signing keys or credentials.
export const WC_PROJECT_ID = (import.meta.env['VITE_WALLETCONNECT_PROJECT_ID'] as string | undefined)
  || "49f651ccd8dfb5d62d4bcb580460e1d1";
const WC_KEY = "aurion.wc";

let connector: DAppConnector | null = null;
let initPromise: Promise<DAppConnector> | null = null;

export async function getConnector() {
  const projectId = WC_PROJECT_ID;
  if (!projectId) throw new Error("WalletConnect is not configured");
  if (connector) return connector;
  initPromise ??= (async () => {
    const sdk = await import("@hiero-ledger/sdk");
    const wc = await import("@hashgraph/hedera-wallet-connect");
    const c = new wc.DAppConnector(
      { name: "Orion", description: "A Hashgraph Wallet on Hedera mainnet", url: window.location.origin, icons: [`${window.location.origin}/theme-icons/v42/default-192.png`] },
      sdk.LedgerId.MAINNET,
      projectId,
      Object.values(wc.HederaJsonRpcMethod),
      [wc.HederaSessionEvent.ChainChanged, wc.HederaSessionEvent.AccountsChanged],
      [wc.HederaChainId.Mainnet],
    );
    await c.init({ logger: "error" });
    connector = c;
    return c;
  })();
  try { return await initPromise; }
  catch (error) { initPromise = null; throw error; }
}

export type WalletOption = { id: string; name: string; installed: boolean };

/** HashPack and Blade, with whether their browser extension was detected. */
export async function walletOptions(): Promise<WalletOption[]> {
  const c = await getConnector();
  await new Promise((r) => setTimeout(r, 600)); // extensions announce asynchronously
  const found = (name: string) => c.extensions.find((e) => e.available && e.name?.toLowerCase().includes(name));
  return ["hashpack", "blade"].map((w) => {
    const ext = found(w);
    return { id: ext?.id ?? w, name: w === "hashpack" ? "HashPack" : "Blade", installed: !!ext };
  });
}

/** Connect via the installed extension, or the WalletConnect QR (mobile app) otherwise. */
export async function connectWallet(opt: WalletOption): Promise<string> {
  const c = await getConnector();
  const session = opt.installed ? await c.connectExtension(opt.id) : await c.openModal();
  const acct = session.namespaces['hedera']?.accounts?.[0]; // "hedera:mainnet:0.0.x"
  if (!acct || !acct.startsWith("hedera:mainnet:")) throw new Error("Wallet is not on Hedera mainnet");
  const id = acct.split(":")[2];
  if (!id || !/^0\.0\.\d{1,10}$/.test(id)) throw new Error("Wallet returned an invalid mainnet account");
  localStorage.setItem(WC_KEY, JSON.stringify({ id, wallet: opt.name }));
  return id;
}

export function connectedWallet(): { id: string; wallet: string } | null {
  try { return JSON.parse(localStorage.getItem(WC_KEY) ?? "null"); } catch { return null; }
}

/** Signer for the connected account, restoring the session if needed. */
export async function getWcSigner(accountId: string): Promise<DAppSigner | null> {
  if (connectedWallet()?.id !== accountId || !WC_PROJECT_ID) return null;
  const c = await getConnector();
  return c.signers.find((s) => s.getAccountId().toString() === accountId) ?? null;
}

export async function disconnectWallet() {
  localStorage.removeItem(WC_KEY);
  if (connector) await connector.disconnectAll().catch(() => {});
}
