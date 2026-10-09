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
