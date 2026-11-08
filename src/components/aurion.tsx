import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ACCOUNT_RE } from "@/lib/hedera";
import { HederaMark } from "@/components/hbar";
import logo96 from "@/assets/orion-logo/orion-silver-rings-96.png.asset.json";
import logo144 from "@/assets/orion-logo/orion-silver-rings-144.png.asset.json";
import logo192 from "@/assets/orion-logo/orion-silver-rings-192.png.asset.json";
import logo288 from "@/assets/orion-logo/orion-silver-rings-288.png.asset.json";
import logo384 from "@/assets/orion-logo/orion-silver-rings-384.png.asset.json";
import logo576 from "@/assets/orion-logo/orion-silver-rings-576.png.asset.json";
import logo768 from "@/assets/orion-logo/orion-silver-rings-768.png.asset.json";
import lightLogo from "@/assets/orion-logo/orion-light-black-rings.png";
import { Button } from "@/components/ui/button";
import { OrionName } from "@/components/orion-name";
import { Home, Wallet, Layers, Handshake, Grid2X2, X, Bot, Settings } from "lucide-react";

// Pre-sized copies keep the fine texture crisp; the browser picks the one matching display size × screen density.
const logoSrcSet = `${logo96.url} 96w, ${logo144.url} 144w, ${logo192.url} 192w, ${logo288.url} 288w, ${logo384.url} 384w, ${logo576.url} 576w, ${logo768.url} 768w`;

export function AurionLogo({ className = "", sizes = "48px" }: { className?: string; sizes?: string }) {
  return <span className={`orion-logo-frame relative inline-flex shrink-0 ${className}`}><img sizes={sizes} srcSet={logoSrcSet} src={logo384.url} alt="Orion logo" width={768} height={768} fetchPriority="high" decoding="async" className="orion-logo h-full w-full object-contain" /><img src={lightLogo} alt="" aria-hidden="true" width={768} height={768} className="orion-light-logo absolute inset-0 hidden h-full w-full object-contain" /></span>;
}

const dock = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "Vault", icon: Wallet },
  { to: "/stake", label: "Stake", icon: Layers },
  { to: "/studio", label: "Studio", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const groups = [
  { name: "Money", items: [{ to: "/", label: "Home" }, { to: "/vault", label: "Vault" }, { to: "/stake", label: "Stake" }] },
  { name: "Tools", items: [{ to: "/studio", label: "AI Studio" }, { to: "/pact", label: "Pact" }, { to: "/legacy", label: "Legacy" }] },
  { name: "Account", items: [{ to: "/wallet", label: "Wallet" }, { to: "/settings", label: "Settings" }] },
  { name: "About", items: [{ to: "/about", label: "About" }, { to: "/company", label: "Company" }, { to: "/privacy", label: "Privacy Policy" }, { to: "/terms", label: "User Agreement" }] },
] as const;

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(undefined);
  const nav = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-32 pt-6">
      <header className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <AurionLogo className="h-12 w-12" />
          <div>
          <Button variant="ghost"
            onPointerDown={() => (timer.current = window.setTimeout(() => setOpen(true), 450))}
            onPointerUp={() => clearTimeout(timer.current)}
            onPointerLeave={() => clearTimeout(timer.current)}
            onContextMenu={(e) => e.preventDefault()}
            className="h-auto select-none p-0 font-brand text-lg font-medium tracking-normal text-foreground hover:bg-transparent"
            onClick={() => setOpen(true)}
            aria-label="Orion — open menu"
          >
            <OrionName className={["Home", "Vault", "Stake", "Studio", "Settings"].includes(title) ? "w-20" : "w-32"} />
          </Button>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            A Hashgraph Wallet
          </p>
          </div>
        </div>
        <div className="flex">
          <Button variant="ghost" size="icon" title="All apps" aria-label="All apps" onClick={() => setOpen(true)}><Grid2X2 /></Button>
        </div>
      </header>
      <main key={title} className="shell-content">{children}</main>
      <footer className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-muted-foreground">
        <Link to="/company" className="hover:text-foreground">Company</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground">User Agreement</Link>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {dock.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="flex flex-col items-center gap-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: true }}
            >
              <d.icon size={20} strokeWidth={1.6} />{d.label}
            </Link>
          ))}
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 p-5 backdrop-blur" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="panel mx-auto mt-24 max-w-md p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2"><OrionName className="w-24" /><Button aria-label="Close apps" variant="ghost" size="icon" onClick={() => setOpen(false)}><X /></Button></div>
            {groups.map((g) => (
              <div key={g.name} className="mt-1 border-t border-border/60 px-1 pt-2 first:mt-0 first:border-t-0 first:pt-0">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{g.name}</p>
                <div className="grid grid-cols-2 gap-1 pb-2">
                  {g.items.map((p) => (
                    <Button variant="ghost" key={p.to}
                      onClick={() => { setOpen(false); nav({ to: p.to }); }}
                      className="h-auto min-h-11 w-full justify-start rounded-md px-3 py-2.5 text-left text-sm hover:bg-graphite"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-5 ${className}`}>{children}</section>;
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{children}</p>;
}

/**
 * Signs with the connected wallet or the device key. `run` receives the passphrase
 * (empty for wallets) and returns a transaction id.
 */
export function SignButton({ accountId, verb, disabled, run, done }: {
  accountId: string | null; verb: string; disabled?: boolean;
  run: (pass: string) => Promise<string>; done: (txId: string) => ReactNode;
}) {
  const [mode, setMode] = useState<import("@/lib/signer").SignMode>({ kind: "none" });
  const [pass, setPass] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [bio, setBio] = useState(false);
  const [offer, setOffer] = useState<string | null>(null);
  useEffect(() => {
    import("@/lib/signer").then((m) => setMode(m.signMode(accountId)));
    import("@/lib/biometric").then((b) => setBio(b.bioEnrolled()));
  }, [accountId, state]);
  if (state === "done") return (
    <SealRing>{done(msg)}
      {offer && <BioOffer pass={offer} onDone={() => setOffer(null)} />}
      <button className="btn-ghost mt-4" onClick={() => setState("idle")}>Done</button>
    </SealRing>
  );
  if (mode.kind === "none")
    return (
      <p className="text-sm text-muted-foreground">
        This account is watch-only on this device. <Link to="/wallet" className="text-signal">Create or connect a wallet</Link> to sign.
      </p>
    );
  const go = async (bio = false) => {
    setState("busy"); setMsg("");
    try {
      const b = await import("@/lib/biometric");
      const p = bio ? await b.bioPassphrase() : pass;
      const id = await run(p);
      if (!bio && mode.kind === "device" && !b.bioEnrolled() && (await b.bioAvailable())) setOffer(p);
      setMsg(id); setState("done"); setPass("");
    } catch (e) { setMsg((e as Error).message); setState("err"); }
  };
  return (
    <div>
      {mode.kind === "device" && bio && (
        <button className="btn mb-3 w-full" disabled={disabled || state === "busy"} onClick={() => go(true)}>
          {state === "busy" ? "Waiting for Hedera…" : `${verb} with Face ID / fingerprint`}
        </button>
      )}
      {mode.kind === "device" && (
        <input type="password" className="field mb-3" placeholder="Device passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
      )}
      <button className="btn w-full" disabled={disabled || state === "busy" || (mode.kind === "device" && !pass)} onClick={() => go(false)}>
        {state === "busy" ? (mode.kind === "wallet" ? `Approve in ${mode.name}…` : "Waiting for Hedera…") : verb}
      </button>
      {state === "err" && <p className="mt-3 text-sm text-destructive">{msg}</p>}
    </div>
  );
}

/** Offer to turn on biometric unlock using a passphrase that just worked. */
export function BioOffer({ pass, onDone }: { pass: string; onDone: () => void }) {
  const [err, setErr] = useState("");
  return (
    <div className="mt-4 rounded-md bg-graphite p-3 text-sm">
      <p>Skip the passphrase next time?</p>
      <button className="btn-ghost mt-2 w-full py-2 text-xs" onClick={async () => {
        try { await (await import("@/lib/biometric")).bioEnroll(pass); onDone(); } catch (e) { setErr((e as Error).message); }
      }}>Turn on Face ID / fingerprint</button>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function BindAccount({ onBind }: { onBind: (id: string) => void }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const t = v.trim();
  const ok = ACCOUNT_RE.test(t);
  const go = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${t}`);
      if (r.status === 404) { setErr(`No account ${t} exists on Hedera mainnet. Check the number.`); return; }
      if (!r.ok) { setErr(`Hedera mirror node returned ${r.status}. Try again.`); return; }
      onBind(t);
    } catch { setErr("Hedera mirror node unreachable. Check your connection."); }
    finally { setBusy(false); }
  };
  return (
    <Panel>
      <Label>Watch a mainnet account</Label>
      <p className="mb-4 text-sm text-muted-foreground">
        Reads need no signature. Enter a Hedera account id.
      </p>
      <input className="field tnum font-mono" placeholder="0.0.123456" value={v} onChange={(e) => { setV(e.target.value); setErr(""); }} />
      {t && !ok && <p className="mt-2 text-xs text-destructive">Account ids look like 0.0.123456.</p>}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <button className="btn mt-3 w-full" disabled={!ok || busy} onClick={go}>
        {busy ? "Checking mainnet…" : "Read from mainnet"}
      </button>
    </Panel>
  );
}

/** Seal moment: violet ring draws in 420ms, then content fades in. */
export function SealRing({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center text-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="mb-4">
        <motion.circle
          cx="44" cy="44" r="38" fill="none" stroke="var(--color-primary)" strokeWidth="3"
          initial={reduce ? { opacity: 0 } : { pathLength: 0 }}
          animate={reduce ? { opacity: 1 } : { pathLength: 1 }}
          transition={{ duration: reduce ? 0.16 : 0.42 }}
        />
        <motion.path
          d="M29 45.5 L39.5 56 L60 34" fill="none" stroke="var(--color-primary)" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.38, duration: reduce ? 0.16 : 0.32, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.42, duration: 0.25 }}>
        {children}
      </motion.div>
    </div>
  );
}
