import oreonLogo from "@/assets/oreon-logo-transparent.png.asset.json";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { ACCOUNT_RE } from "@/lib/hedera";
import { HederaMark } from "@/components/hbar";
import { Button } from "@/components/ui/button";
import { OrionName } from "@/components/orion-name";
import { PortfolioTracker } from "@/components/portfolio-tracker";
import { useAccount } from "@/lib/account";
import { Home, Layers, Handshake, X, Settings, Sparkles } from "lucide-react";

/** Custom Vault mark: a vault dial — six prongs, broken outer and inner arcs,
 *  and a solid keyhole at the centre. Drawn to match the lucide stroke style. */
function VaultGlyph({ size = 24, strokeWidth }: { size?: number; strokeWidth?: number }) {
  // The bottom tab bar draws this at ~20px, where the arc gaps need extra air.
  // The dial's arc gaps need more air than the neighbouring icons, so the
  // stroke stays at or below this icon's own cap whatever the caller passes.
  const cap = size <= 20 ? 0.85 : 0.9;
  const sw = Math.min(strokeWidth ?? cap, cap);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
      <path d="M12 7.6V1M15.81 9.8 21.53 6.5M15.81 14.2 21.53 17.5M12 16.4V23M8.19 14.2 2.47 17.5M8.19 9.8 2.47 6.5" />
      <path d="M12 3.8A8.2 8.2 0 0 1 17.49 5.91M19.1 7.9A8.2 8.2 0 0 1 20.02 13.7M19.1 16.1A8.2 8.2 0 0 1 14.53 19.8M12 20.2A8.2 8.2 0 0 1 6.51 18.09M4.9 16.1A8.2 8.2 0 0 1 3.98 10.3M4.9 7.9A8.2 8.2 0 0 1 9.47 4.2" />
      <path d="M12 7A5 5 0 0 0 8.65 8.28M16.33 9.5A5 5 0 0 0 13.55 7.24M16.33 14.5A5 5 0 0 0 16.89 10.96M12 17A5 5 0 0 0 15.35 15.72M7.67 14.5A5 5 0 0 0 10.45 16.76M7.67 9.5A5 5 0 0 0 7.11 13.04" />
      <g fill="currentColor" stroke="none">
        <circle cx="12" cy="10.6" r="0.95" />
        <path d="M11.45 11.3h1.1l0.9 2.9h-2.9z" />
      </g>
    </svg>
  );
}

export function AurionLogo({ className = "", sizes = "48px", orbit = false, crisp = false }: { className?: string; sizes?: string; orbit?: boolean; crisp?: boolean }) {
  return <span className={`orion-logo-frame ${crisp && !orbit ? "orion-home-logo" : ""} relative inline-flex shrink-0 ${className}`} role="img" aria-label="Oreon logo">
    <img src={oreonLogo.url} sizes={sizes} alt="" aria-hidden="true" width={635} height={635} className="relative h-full w-full object-contain" />
  </span>;
}

const dock = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "Vault", icon: VaultGlyph },
  { to: "/stake", label: "Stake", icon: Layers },
  { to: "/studio", label: "Studio", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const groups = [
  { name: "Money", items: [{ to: "/", label: "Home" }, { to: "/vault", label: "Vault" }, { to: "/stake", label: "Stake" }] },
  { name: "Tools", items: [{ to: "/studio", label: "AI Studio" }, { to: "/pact", label: "Pact" }, { to: "/legacy", label: "Legacy" }] },
  { name: "Account", items: [{ to: "/wallet", label: "Wallet" }, { to: "/settings", label: "Settings" }] },
  { name: "About", items: [{ to: "/about", label: "About" }, { to: "/company", label: "Company" }, { to: "/privacy", label: "Privacy Policy" }, { to: "/terms", label: "User Agreement" }] },
] as const;

/** Inside a Vault section, a page's Shell renders only its content. */
export const ShellEmbed = createContext(false);

export function Shell({ title, children, hideBranding = false, className = "" }: { title: string; children: ReactNode; hideBranding?: boolean; className?: string }) {
  if (useContext(ShellEmbed)) return <>{children}</>;
  return <ShellFrame title={title} hideBranding={hideBranding} className={className}>{children}</ShellFrame>;
}

function ShellFrame({ title, children, hideBranding = false, className = "" }: { title: string; children: ReactNode; hideBranding?: boolean; className?: string }) {
  const { id } = useAccount();
  const [open, setOpen] = useState(false);
  const [dockPreview, setDockPreview] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const previewDock = (event: PointerEvent<HTMLElement>) => {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLAnchorElement>("a[data-dock-preview]");
    setDockPreview(target && event.currentTarget.contains(target) ? target.dataset["dockPreview"] ?? null : null);
  };
  const dockFeedback = {
    onPointerMove: previewDock,
    onPointerDown: previewDock,
    onPointerLeave: () => setDockPreview(null),
    onPointerUp: () => setDockPreview(null),
    onPointerCancel: () => setDockPreview(null),
  };
  const glide = (key: string, group: string) => dockPreview === key ? <motion.span
    className="dock-glide" layoutId={`dock-glide-${group}`} aria-hidden="true"
    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34 }}
  /> : null;
  const timer = useRef<number>(undefined);
  const nav = useNavigate();
  return (
    <div className={`app-shell min-h-dvh w-full max-w-full bg-background ${className}`}>
      {id && title !== "Home" && <PortfolioTracker key={id} accountId={id} />}
      <header className="shell-header grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        {!hideBranding && <div className="flex min-w-0 items-center gap-3">
          <AurionLogo className="shell-logo h-9 w-9" crisp />
          <div>
          <Button variant="ghost"
            onPointerDown={() => (timer.current = window.setTimeout(() => setOpen(true), 450))}
            onPointerUp={() => clearTimeout(timer.current)}
            onPointerLeave={() => clearTimeout(timer.current)}
            onContextMenu={(e) => e.preventDefault()}
            className="h-auto select-none p-0 font-brand text-lg font-medium tracking-normal text-foreground hover:bg-transparent"
            onClick={() => setOpen(true)}
            aria-label="Oreon — open menu"
          >
            <OrionName className="shell-wordmark w-[88px]" />
          </Button>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-light tracking-[0.08em] text-muted-foreground"><HederaMark size={10} /> Powered by Hedera</p>
          </div>
        </div>}
      </header>
      <main key={title} className="shell-content w-full min-w-0 max-w-full">{children}</main>
      <footer className="shell-footer mt-10 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-muted-foreground">
        <Link to="/company" className="hover:text-foreground">Company</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground">User Agreement</Link>
      </footer>
      <nav aria-label="Main" className="app-dock-nav fixed inset-x-0 bottom-0 z-40" {...dockFeedback}>
        <div className="app-dock grid w-full max-w-full grid-cols-5">
          {dock.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              data-dock-preview={`bottom-${d.to}`}
              data-preview={dockPreview === `bottom-${d.to}` ? "true" : undefined}
              onFocus={() => setDockPreview(`bottom-${d.to}`)}
              onBlur={() => setDockPreview(null)}
              className="dock-link relative flex flex-col items-center gap-1.5 pb-1 pt-4 text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "dock-active text-primary font-medium", "aria-current": "page" }}
              activeOptions={{ exact: true }}
            >
              {glide(`bottom-${d.to}`, "bottom")}
              <d.icon size={20} strokeWidth={1.6} /><span className="dock-label">{d.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <nav aria-label="Main" className="side-orbs" {...dockFeedback}>
        {dock.filter((d) => d.to !== "/stake" && d.to !== "/settings").map((d) => (
          <Link key={d.to} to={d.to} aria-label={d.label} title={d.label} className="side-orb" data-dock-preview={`side-${d.to}`} data-preview={dockPreview === `side-${d.to}` ? "true" : undefined} onFocus={() => setDockPreview(`side-${d.to}`)} onBlur={() => setDockPreview(null)} activeProps={{ className: "side-orb-active", "aria-current": "page" }} activeOptions={{ exact: true }}>
            {glide(`side-${d.to}`, "side")}
            <d.icon size={24} strokeWidth={1.7} />
          </Link>
        ))}
      </nav>
      <nav aria-label="Settings" className="side-orb-solo" {...dockFeedback}>
        <Link to="/settings" aria-label="Settings" title="Settings" className="side-orb" data-dock-preview="solo-settings" data-preview={dockPreview === "solo-settings" ? "true" : undefined} onFocus={() => setDockPreview("solo-settings")} onBlur={() => setDockPreview(null)} activeProps={{ className: "side-orb-active", "aria-current": "page" }} activeOptions={{ exact: true }}>
          {glide("solo-settings", "solo")}
          <Settings size={24} strokeWidth={1.7} />
        </Link>
      </nav>
      {open && (
        <div className="app-safe-screen fixed inset-0 z-50 overflow-y-auto bg-background/80 p-5 backdrop-blur" onClick={() => setOpen(false)}>
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
export function SignButton({ accountId, verb, disabled, run, done, unsigned }: {
  accountId: string | null; verb: string; disabled?: boolean; unsigned?: (() => Promise<string>) | undefined;
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
      <div className="text-sm text-muted-foreground">
        <p>This account is watch-only on this device. <Link to="/wallet" className="text-signal">Create or connect a wallet</Link> to sign here.</p>
        {unsigned && accountId && <UnsignedPayload build={unsigned} />}
      </div>
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

/** Watch-only accounts: build an unsigned transaction for a hardware signer. Nothing is signed here. */
function UnsignedPayload({ build }: { build: () => Promise<string> }) {
  const [hex, setHex] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [QR, setQR] = useState<null | typeof import("qrcode.react").QRCodeSVG>(null);
  return (
    <div className="mt-3">
      <button className="btn-ghost w-full" onClick={async () => {
        setErr("");
        try { setHex(await build()); const m = await import("qrcode.react"); setQR(() => m.QRCodeSVG); } catch (e) { setErr((e as Error).message); }
      }}>Prepare unsigned transaction</button>
      {hex && <div className="mt-3 space-y-2">
        {QR && hex.length < 2600 && <div className="mx-auto w-fit rounded-xl bg-white p-3"><QR value={hex} size={200} /></div>}
        <textarea readOnly className="field h-24 font-mono text-[10px]" value={hex} />
        <button className="btn-ghost w-full py-2 text-xs" onClick={() => navigator.clipboard.writeText(hex)}>Copy payload</button>
        <p className="text-[11px]">Hedera transaction bytes (hex), valid for about 2 minutes. Sign with a tool that supports Hedera, such as your Ledger's Hedera app, then submit it.</p>
      </div>}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
