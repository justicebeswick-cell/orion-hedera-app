import { useEffect, useState } from "react";
import { ShieldCheck, Globe, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDappWallet } from "@/components/dapp-browser";
import { WC_PROJECT_ID } from "@/lib/walletconnect";

/** Global approval sheet for WalletConnect connection and signing requests. */
export function DappApprovals() {
  const { mod, state } = useDappWallet();
  const [account, setAccount] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  useEffect(() => {
    if (mod && WC_PROJECT_ID && localStorage.getItem("orion.wc.wallet-used")) mod.startWallet().catch(() => {});
    import("@/lib/keystore").then((k) => setAccount(k.readKeystoreMeta()?.accountId ?? null));
    import("@/lib/biometric").then((b) => setBio(b.bioEnrolled()));
  }, [mod, state.pending.length]);
  const p = state.pending[0];
  if (!p || !mod) return null;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); setCode(""); localStorage.setItem("orion.wc.wallet-used", "1"); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const sign = (useBio: boolean) => act(async () => {
    if (p.kind !== "request" || !account) throw new Error("No device key on this device");
    const pass = useBio ? await (await import("@/lib/biometric")).bioPassphrase() : code;
    await mod.approveRequest(p, account, pass);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={p.kind === "proposal" ? "Connection request" : "Signature request"}>
      <div className="panel m-3 w-full max-w-md p-5">
        {p.kind === "proposal" ? (<>
          <div className="mb-4 flex items-center gap-3">
            {p.icon ? <img src={p.icon} alt="" className="size-10 rounded-lg" /> : <Globe size={32} />}
            <div className="min-w-0"><p className="font-medium">{p.name} wants to connect</p><p className="truncate text-xs text-muted-foreground">{p.url}</p></div>
          </div>
          <p className="mb-2 text-sm">It will see account <span className="font-mono">{account ?? "—"}</span> on Hedera mainnet and may ask you to:</p>
          <ul className="mb-4 list-disc pl-5 text-xs text-muted-foreground">{[...new Set(p.methods)].map((m) => <li key={m}>{m.replace("hedera_", "").replace(/([A-Z])/g, " $1").toLowerCase()}</li>)}</ul>
          <p className="mb-4 text-xs text-muted-foreground">Connecting does not move funds. Every transaction asks you again.</p>
          {!account && <p className="mb-3 text-sm text-destructive">Connect failed: this device has no signing key. Create or import a wallet first.</p>}
          {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => act(() => mod.rejectProposal(p))}>Reject</Button>
            <Button disabled={busy || !account} onClick={() => act(() => mod.approveProposal(p, account!))}><ShieldCheck /> Connect</Button>
          </div>
        </>) : (<>
          <p className="mb-1 font-medium">{p.dapp} asks you to sign</p>
          <p className="mb-3 text-xs text-muted-foreground">From account {account} · Hedera mainnet</p>
          <div className="mb-4 space-y-1 rounded-md border border-border bg-background p-3 font-mono text-xs break-all">{p.lines.map((l, i) => <p key={i}>{l}</p>)}</div>
          {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
          {bio && <Button className="mb-2 w-full" disabled={busy} onClick={() => sign(true)}><Fingerprint /> Approve with biometrics</Button>}
          <input type="password" inputMode="numeric" aria-label="Device code" placeholder="Device code" className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => act(() => mod.rejectRequest(p))}>Reject</Button>
            <Button disabled={busy || !code} onClick={() => sign(false)}>{busy ? "Signing…" : "Approve"}</Button>
          </div>
        </>)}
      </div>
    </div>
  );
}
