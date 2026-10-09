import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Shell, Panel, Label, BindAccount, SignButton } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { useAccount } from "@/lib/account";
import { getAccount, hbar, ACCOUNT_RE, HASHSCAN } from "@/lib/hedera";
import { sendHbar } from "@/lib/signer";
import { audit, checkSend, getLimits, setLimits, readAudit, type AuditEntry } from "@/lib/guard";
import { useEffect } from "react";
import { TOKENS, SLIPPAGE, quote, tokenBalance, swapHbar, fmtUnits, type SwapToken } from "@/lib/swap";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault — AURION" },
      { name: "description", content: "Your mainnet HBAR vault. Send limits and recipient checks run before value moves." },
      { property: "og:title", content: "Vault — AURION" },
      { property: "og:description", content: "Hold HBAR on Hedera mainnet. AURION cannot move it unless you sign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vault,
});

function Vault() {
  const { id, ready, bind } = useAccount();
  const [copied, setCopied] = useState(false);
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => getAccount(id!), enabled: !!id, retry: false });
  if (!ready) return <Shell title="Vault"><div /></Shell>;
  if (!id) return <Shell title="Vault"><BindAccount onBind={bind} /><Link to="/wallet" className="btn mt-3 w-full">Create or connect a wallet</Link></Shell>;

  return (
    <Shell title="Vault">
      <Panel>
        <Label>Balance</Label>
        <p className="flex items-center gap-2 text-4xl font-semibold tnum">{acct.data ? hbar(acct.data.tinybar) : "—"} <HbarLogo size={22} /></p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Held in your Hedera account. AURION cannot move it unless you sign. Every send is checked against your limits first.
        </p>
      </Panel>

      <Panel className="mt-4">
        <Label>Receive</Label>
        <div className="flex items-center gap-5">
          <div className="rounded-md bg-foreground p-2">
            <QRCodeSVG value={id} size={96} bgColor="transparent" fgColor="oklch(0.08 0.012 310)" />
          </div>
          <div>
            <p className="font-mono text-lg tnum">{id}</p>
            <button className="btn-ghost mt-2 py-2 text-xs" onClick={() => { navigator.clipboard.writeText(id); setCopied(true); }}>
              {copied ? "Copied" : "Copy account id"}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Inbound transfers are watched. Large inbounds pause sends until reviewed.</p>
      </Panel>

      <Panel className="mt-4">
        <Label>Send HBAR on mainnet</Label>
        <SendForm id={id} onSent={() => acct.refetch()} />
      </Panel>
      <SwapPanel id={id} onSwapped={() => acct.refetch()} />
      <LimitsPanel />
      <AuditPanel />
    </Shell>
  );
}

function SendForm({ id, onSent }: { id: string; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [memo, setMemo] = useState("");
  const n = Number(amt);
  const ok = ACCOUNT_RE.test(to.trim()) && n > 0;
  return (
    <div className="space-y-3">
      <input className="field font-mono tnum" placeholder="To 0.0.…" value={to} onChange={(e) => setTo(e.target.value)} />
      <div className="relative"><input className="field tnum pr-10" inputMode="decimal" placeholder="Amount ℏ" value={amt} onChange={(e) => setAmt(e.target.value)} /><HbarLogo size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" /></div>
      <input className="field" maxLength={100} placeholder="Note (public, optional)" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <SignButton accountId={id} disabled={!ok} verb={ok ? `Send ${n} ℏ` : "Send"} run={async (pass) => {
        const dest = to.trim();
        const block = await checkSend(id, dest, n);
        if (block) { audit({ action: "blocked", detail: `${id} → ${dest} ${n} ℏ · ${block}`, ok: false }); throw new Error(block); }
        try {
          const txId = await sendHbar(id, dest, n, memo, pass);
          audit({ action: "send", detail: `${id} → ${dest} ${n} ℏ`, ok: true, txId });
          setTimeout(onSent, 4000);
          return txId;
        } catch (e) { audit({ action: "send", detail: `${id} → ${dest} ${n} ℏ · ${(e as Error).message}`, ok: false }); throw e; }
      }} done={(txId) => (
        <>
          <p className="font-semibold text-success">Sent on Hedera</p>
          <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
        </>
      )} />
    </div>
  );
}

function SwapPanel({ id, onSwapped }: { id: string; onSwapped: () => void }) {
  const [tok, setTok] = useState<SwapToken>(TOKENS[0]);
  const [amt, setAmt] = useState("");
  const [debounced, setDebounced] = useState(0);
  const n = Number(amt);
  useEffect(() => { const t = setTimeout(() => setDebounced(n > 0 ? n : 0), 350); return () => clearTimeout(t); }, [n]);
  const q = useQuery({ queryKey: ["quote", tok.id, debounced], queryFn: () => quote(tok, debounced), enabled: debounced > 0, refetchInterval: 15_000, retry: false });
  const rate = useQuery({ queryKey: ["quote", tok.id, 1], queryFn: () => quote(tok, 1), refetchInterval: 30_000, retry: false });
  const bal = useQuery({ queryKey: ["tokbal", id, tok.id], queryFn: () => tokenBalance(id, tok.id), refetchInterval: 15_000 });
  const out = debounced === n && q.data ? q.data : null;
  const minOut = out ? (out * BigInt(Math.round((1 - SLIPPAGE) * 10000))) / 10000n : 0n;
  const ok = n > 0 && !!out;
  return (
    <Panel className="mt-4">
      <Label>Swap HBAR for tokens</Label>
      <div className="mb-3 flex flex-wrap gap-2">
        {TOKENS.map((t) => (
          <button key={t.id} onClick={() => setTok(t)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${t.id === tok.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t.symbol}
          </button>
        ))}
      </div>
      <div className="relative"><input className="field tnum pr-10" inputMode="decimal" placeholder="You pay (HBAR)" value={amt} onChange={(e) => setAmt(e.target.value)} /><HbarLogo size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" /></div>
      <div className="my-2 text-center text-muted-foreground">↓</div>
      <div className="field flex items-center justify-between tnum">
        <span className={out ? "" : "text-muted-foreground"}>{n > 0 ? (out ? fmtUnits(out, tok.decimals) : q.isError ? "No price" : "…") : "You get"}</span>
        <span className="text-xs font-semibold">{tok.symbol}</span>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground tnum">
        {rate.data && <p>1 ℏ ≈ {fmtUnits(rate.data, tok.decimals)} {tok.symbol} · live from SaucerSwap</p>}
        {out && <p>At least {fmtUnits(minOut, tok.decimals)} {tok.symbol} or it cancels (1% price protection)</p>}
        <p>You hold {bal.data == null ? `0 ${tok.symbol}${bal.data === null ? " — first swap adds it to your account (small fee)" : ""}` : `${fmtUnits(bal.data, tok.decimals)} ${tok.symbol}`}</p>
      </div>
      <div className="mt-3">
        <SignButton accountId={id} disabled={!ok} verb={ok ? `Swap ${n} ℏ for ${tok.symbol}` : "Swap"} run={async (pass) => {
          try {
            const txId = await swapHbar(id, tok, n, minOut, pass);
            audit({ action: "swap", detail: `${n} ℏ → ${tok.symbol}`, ok: true, txId });
            setTimeout(() => { onSwapped(); bal.refetch(); }, 4000);
            return txId;
          } catch (e) { audit({ action: "swap", detail: `${n} ℏ → ${tok.symbol} · ${(e as Error).message}`, ok: false }); throw e; }
        }} done={(txId) => (
          <>
            <p className="font-semibold text-success">Swapped on Hedera</p>
            <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
          </>
        )} />
      </div>
    </Panel>
  );
}

function LimitsPanel() {
  const [l, setL] = useState({ perSend: "", perDay: "" });
  const [saved, setSaved] = useState(false);
  useEffect(() => { const g = getLimits(); setL({ perSend: String(g.perSend), perDay: String(g.perDay) }); }, []);
  return (
    <Panel className="mt-4">
      <Label>Send limits</Label>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="mb-1 text-xs text-muted-foreground">Per send ℏ</p><input className="field tnum" inputMode="decimal" value={l.perSend} onChange={(e) => { setL({ ...l, perSend: e.target.value }); setSaved(false); }} /></div>
        <div><p className="mb-1 text-xs text-muted-foreground">Per 24 hours ℏ</p><input className="field tnum" inputMode="decimal" value={l.perDay} onChange={(e) => { setL({ ...l, perDay: e.target.value }); setSaved(false); }} /></div>
      </div>
      <button className="btn-ghost mt-3 w-full py-2 text-xs" disabled={!(Number(l.perSend) > 0 && Number(l.perDay) > 0)}
        onClick={() => { setLimits({ perSend: Number(l.perSend), perDay: Number(l.perDay) }); setSaved(true); }}>{saved ? "Saved" : "Save limits"}</button>
      <p className="mt-3 text-xs text-muted-foreground">Before each send: limits, then the recipient is screened — it must exist on mainnet, not be deleted, and not be on the blocked list.</p>
    </Panel>
  );
}

function AuditPanel() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => { setRows(readAudit()); const t = setInterval(() => setRows(readAudit()), 3000); return () => clearInterval(t); }, []);
  return (
    <Panel className="mt-4">
      <Label>Audit log · this device</Label>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
        <ul className="divide-y divide-border text-xs">
          {rows.slice(0, 30).map((r, i) => (
            <li key={i} className="py-2">
              <p className="flex justify-between"><span className={r.ok ? "text-success" : "text-destructive"}>{r.action}</span><span className="text-muted-foreground tnum">{new Date(r.at).toLocaleString()}</span></p>
              <p className="break-all text-muted-foreground">{r.detail}</p>
              {r.txId && <a className="break-all text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${r.txId}`}>{r.txId}</a>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
