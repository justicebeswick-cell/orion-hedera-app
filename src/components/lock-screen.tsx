import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AurionLogo } from "@/components/aurion";
import { OrionName } from "@/components/orion-name";
import { markUnlocked } from "@/lib/lock";
import { Fingerprint, Delete, ArrowUpRight, ArrowLeftRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Only a non-sensitive wallet silhouette sits behind the glass, never unlocked routes. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const [length, setLength] = useState<4 | 6 | 8 | undefined>();
  const reduce = useReducedMotion();
  useEffect(() => {
    import("@/lib/biometric").then((b) => setBio(b.bioEnrolled()));
    import("@/lib/keystore").then((k) => setLength(k.readKeystoreMeta()?.codeLength));
  }, []);
  const unlock = async (useBio: boolean, code = pass) => {
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const phrase = useBio ? await (await import("@/lib/biometric")).bioPassphrase() : code;
      await (await import("@/lib/keystore")).unlockKeystore(phrase);
      markUnlocked(); onUnlock();
    } catch (e) { setErr((e as Error).message); setPass(""); }
    finally { setBusy(false); }
  };
  const digit = (n: string) => {
    if (busy || !length || pass.length >= length) return;
    const code = pass + n; setPass(code); setErr("");
    if (code.length === length) void unlock(false, code);
  };
  return <>
    <div className="unlock-backdrop" aria-hidden="true">
      <div className="mx-auto max-w-xl px-5 pt-8 opacity-70">
        <div className="mb-8 flex items-center gap-3"><AurionLogo className="h-12 w-12" /><OrionName className="w-32" /></div>
        <div className="h-20 rounded-lg bg-secondary" />
        <div className="my-5 grid grid-cols-3 gap-2">{[ArrowUpRight, ArrowLeftRight, ArrowDownLeft].map((Icon, i) => <div key={i} className="flex h-12 items-center justify-center rounded-lg bg-primary"><Icon /></div>)}</div>
        {[0, 1, 2, 3].map((i) => <div key={i} className="my-6 flex items-center gap-4"><span className="h-12 w-12 rounded-lg bg-primary/40" /><span className="h-4 w-28 rounded bg-muted" /><span className="ml-auto h-4 w-20 rounded bg-muted" /></div>)}
      </div>
    </div>
    <div className="unlock-glass" role="dialog" aria-modal="true" aria-label="Unlock Orion">
      <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex min-h-full w-full max-w-xs flex-col items-center justify-center">
        <div className="flex items-center gap-2"><AurionLogo className="h-12 w-12" /><h1><OrionName className="w-44" /></h1></div>
        <p className="mt-1 text-xs text-muted-foreground">A Hashgraph Wallet</p>
        <p className="mt-8 text-sm font-medium">{busy ? "Unlocking…" : length ? "Enter your device code" : "Enter your existing passphrase"}</p>
        {length ? <>
          <div className="my-8 flex h-4 justify-center gap-4" aria-label={`${pass.length} of ${length} digits entered`}>{Array.from({ length }, (_, i) => <span key={i} className={`unlock-dot ${i < pass.length ? "unlock-dot-filled" : ""}`} />)}</div>
          <div className="grid w-full grid-cols-3 gap-x-5 gap-y-1" aria-label="Numeric keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n, i) => <Button key={n} variant="ghost" className="unlock-key flex-col gap-0" disabled={busy} aria-label={n} onClick={() => digit(n)}>{n}<span className="text-[9px] text-muted-foreground">{["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"][i]}</span></Button>)}
            <Button variant="ghost" className="unlock-key" disabled={busy || !bio} aria-label="Unlock with biometrics" onClick={() => unlock(true)}><Fingerprint className="size-7" /></Button>
            <Button variant="ghost" className="unlock-key" disabled={busy} onClick={() => digit("0")}>0</Button>
            <Button variant="ghost" className="unlock-key" disabled={busy} aria-label="Delete digit" onClick={() => setPass((s) => s.slice(0, -1))}><Delete className="size-6" /></Button>
          </div>
        </> : <div className="mt-6 w-full space-y-3">
          <input autoFocus type="password" className="field" placeholder="Device passphrase" aria-label="Device passphrase" value={pass} disabled={busy} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && pass) void unlock(false); }} />
          <Button className="w-full" disabled={!pass || busy} onClick={() => unlock(false)}>Unlock</Button>
          {bio && <Button variant="outline" className="w-full" disabled={busy} onClick={() => unlock(true)}><Fingerprint />Face ID / fingerprint</Button>}
        </div>}
        {err && <p role="alert" className="mt-3 text-center text-sm text-destructive">{err}</p>}
        <Button variant="link" className="mt-5 text-xs text-muted-foreground" onClick={() => { if (confirm("Sign out of this account on this device? Your saved key stays.")) { localStorage.removeItem("aurion.account"); location.reload(); } }}>Use a different wallet</Button>
      </motion.div>
    </div>
  </>;
}
