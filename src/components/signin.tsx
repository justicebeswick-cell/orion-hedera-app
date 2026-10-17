import { useEffect, useState } from "react";
import { Panel, Label } from "@/components/aurion";
import { activateSavedAccount, forgetSavedAccount, listSavedAccounts, renameSavedAccount, unlockKeystore, type SavedAccount } from "@/lib/keystore";

/** Shown when signed out: every account saved on this device, one tap to sign back in. */
export function SignBackIn({ onIn }: { onIn: (id: string) => void }) {
  const [list, setList] = useState<SavedAccount[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [bio, setBio] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const refresh = () => { const l = listSavedAccounts(); setList(l); setPick((p) => p ?? l[0]?.id ?? null); };
  useEffect(() => { refresh(); import("@/lib/biometric").then((b) => setBio(b.bioEnrolled())); }, []);
  if (!list.length) return null;
  const sel = list.find((a) => a.id === pick);

  const unlock = async (useBio: boolean) => {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      activateSavedAccount(sel.id);
      const p = useBio ? await (await import("@/lib/biometric")).bioPassphrase() : pass;
      await unlockKeystore(p);
      onIn(sel.id);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <Panel>
      <Label>Sign back in</Label>
      <ul className="mb-4 space-y-2">
        {list.map((a) => (
          <li key={a.id}>
            <button onClick={() => { setPick(a.id); setErr(""); setPass(""); }} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${pick === a.id ? "border-signal" : "border-border"}`}>
              <span><span className="block text-sm">{a.label || (a.blob ? "Device wallet" : "Wallet app / view only")}</span><span className="font-mono text-xs text-muted-foreground tnum">{a.id}</span></span>
              <span className="text-xs text-muted-foreground">{a.blob ? "Key saved" : "No key"}</span>
            </button>
          </li>
        ))}
      </ul>
      {sel && (
        <>
          {sel.blob ? (
            <>
              {bio && <button className="btn mb-3 w-full" disabled={busy} onClick={() => unlock(true)}>Sign in with Face ID / fingerprint</button>}
              <input type="password" className="field" placeholder="Device passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
              <button className="btn-ghost mt-3 w-full" disabled={busy || !pass} onClick={() => unlock(false)}>{busy ? "Unlocking…" : "Sign in with passphrase"}</button>
            </>
          ) : (
            <button className="btn w-full" onClick={() => onIn(sel.id)}>Continue as {sel.id}</button>
          )}
          <div className="mt-3 flex justify-between text-xs">
            <button className="text-muted-foreground" onClick={() => { const n = prompt("Name this account", sel.label); if (n !== null) { renameSavedAccount(sel.id, n.trim()); refresh(); } }}>Rename</button>
            <button className="text-muted-foreground" onClick={() => { if (confirm(`Remove ${sel.id} from this device? Its saved key is deleted. Keep your recovery phrase.`)) { forgetSavedAccount(sel.id); setPick(null); refresh(); } }}>Remove</button>
          </div>
        </>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </Panel>
  );
}
