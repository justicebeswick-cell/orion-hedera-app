import { useEffect, useState } from "react";
import { Panel, Label } from "@/components/aurion";
import { readKeystoreMeta, unlockKeystore } from "@/lib/keystore";
import { connectedWallet } from "@/lib/walletconnect";

/** Shown when signed out but this device still holds a key or wallet session. */
export function SignBackIn({ onIn }: { onIn: (id: string) => void }) {
  const [acct, setAcct] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [bio, setBio] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    setAcct(readKeystoreMeta()?.accountId ?? null);
    const w = connectedWallet();
    setWallet(w ? w.id : null);
    import("@/lib/biometric").then((b) => setBio(b.bioEnrolled()));
  }, []);
  if (!acct && !wallet) return null;

  const viaKey = async (useBio: boolean) => {
    setBusy(true); setErr("");
    try {
      const p = useBio ? await (await import("@/lib/biometric")).bioPassphrase() : pass;
      await unlockKeystore(p);
      onIn(acct!);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <Panel>
      <Label>Sign back in</Label>
      {acct && (
        <>
          <p className="mb-3 font-mono text-sm tnum">{acct}</p>
          {bio && <button className="btn mb-3 w-full" disabled={busy} onClick={() => viaKey(true)}>Sign in with Face ID / fingerprint</button>}
          <input type="password" className="field" placeholder="Device passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn-ghost mt-3 w-full" disabled={busy || !pass} onClick={() => viaKey(false)}>{busy ? "Unlocking…" : "Sign in with passphrase"}</button>
        </>
      )}
      {wallet && wallet !== acct && (
        <button className="btn-ghost mt-3 w-full" onClick={() => onIn(wallet)}>Continue as {wallet} (wallet)</button>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </Panel>
  );
}
