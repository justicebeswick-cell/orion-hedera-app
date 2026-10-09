import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { ACCOUNT_RE } from "@/lib/hedera";

const dock = [
  { to: "/", label: "Home" },
  { to: "/vault", label: "Vault" },
  { to: "/stake", label: "Stake" },
  { to: "/pact", label: "Pact" },
] as const;

const palette = [
  { to: "/", label: "Home" },
  { to: "/vault", label: "Vault" },
  { to: "/stake", label: "Stake" },
  { to: "/pact", label: "Pact" },
  { to: "/legacy", label: "Legacy" },
  { to: "/wallet", label: "Wallet" },
  { to: "/about", label: "About" },
] as const;

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(undefined);
  const nav = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-32 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <button
          onPointerDown={() => (timer.current = window.setTimeout(() => setOpen(true), 450))}
          onPointerUp={() => clearTimeout(timer.current)}
          onPointerLeave={() => clearTimeout(timer.current)}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none text-sm font-semibold tracking-[0.4em] text-signal"
          aria-label="AURION — hold for commands"
        >
          AURION
        </button>
        <span className="text-xs text-muted-foreground">{title}</span>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {dock.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="py-4 text-center text-xs text-muted-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: true }}
            >
              {d.label}
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
          >
            {palette.map((p) => (
              <button
                key={p.to}
                onClick={() => nav({ to: p.to })}
                className="block w-full rounded-md px-4 py-3 text-left text-sm hover:bg-graphite"
              >
                {p.label}
              </button>
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

export function IdentityGate({ action }: { action: string }) {
  return (
    <div className="rounded-lg border border-border bg-graphite p-4 text-sm">
      <p className="font-medium">{action} is off.</p>
      <p className="mt-1 text-muted-foreground">
        Identity is not approved. Sends, pacts and the switch stay locked until review passes.
      </p>
      <button className="btn mt-4 w-full" disabled>
        Start identity review
      </button>
      <p className="mt-2 text-xs text-muted-foreground">Identity vendor not connected yet.</p>
    </div>
  );
}

export function BindAccount({ onBind }: { onBind: (id: string) => void }) {
  const [v, setV] = useState("");
  const ok = ACCOUNT_RE.test(v.trim());
  return (
    <Panel>
      <Label>Watch a mainnet account</Label>
      <p className="mb-4 text-sm text-muted-foreground">
        Reads need no signature. Enter a Hedera account id.
      </p>
      <input className="field tnum font-mono" placeholder="0.0.123456" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn mt-3 w-full" disabled={!ok} onClick={() => onBind(v.trim())}>
        Read from mainnet
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
      </svg>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.42, duration: 0.25 }}>
        {children}
      </motion.div>
    </div>
  );
}
