import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AurionLogo } from "@/components/aurion";
import { markUnlocked } from "@/lib/lock";
import { Fingerprint } from "lucide-react";

/** Full-screen gate shown when the app was closed and the owner must unlock. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    import("@/lib/biometric").then((b) => setBio(b.bioEnrolled()));
  }, []);

  const unlock = async (useBio: boolean) => {
    setErr(""); setBusy(true);
    try {
      const p = useBio ? (await import("@/lib/biometric")).bioPassphrase() : Promise.resolve(pass);
      const phrase = await p;
      await (await import("@/lib/keystore")).unlockKeystore(phrase); // throws on a wrong passphrase
      markUnlocked();
      onUnlock();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-xs flex-col items-center"
      >
        <AurionLogo className="h-24 w-24 drop-shadow-[0_0_28px_var(--glow)]" />
        <h1 className="mt-6 font-brand text-xl font-medium tracking-[0.2em] text-foreground">HashBase</h1>
        <p className="mt-2 text-sm text-muted-foreground">Locked while you were away</p>

        {bio && (
          <button className="btn mt-8 w-full" disabled={busy} onClick={() => unlock(true)}>
            <Fingerprint className="mr-2 inline h-4 w-4" />
            {busy ? "Checking…" : "Unlock with Face ID / fingerprint"}
          </button>
        )}

        <input
          type="password"
          className="field mt-4 w-full"
          placeholder="Device passphrase"
          value={pass}
          onChange={(e) => { setPass(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && pass && !busy) unlock(false); }}
          aria-label="Device passphrase"
        />
        <button className={`btn w-full ${bio ? "btn-ghost mt-2" : "mt-4"}`} disabled={!pass || busy} onClick={() => unlock(false)}>
          {busy ? "Checking…" : "Unlock"}
        </button>

        {err && <p className="mt-3 text-center text-sm text-destructive">{err}</p>}

        <button
          className="mt-8 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => {
            if (confirm("Sign out of this account on this device? Your saved key stays.")) {
              localStorage.removeItem("aurion.account");
              location.reload();
            }
          }}
        >
          Use a different wallet
        </button>
      </motion.div>
    </div>
  );
}
