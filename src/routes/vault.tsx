import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CalendarClock, History, ShieldCheck, Receipt, Globe, Coins, BookUser } from "lucide-react";
import { VaultDeck } from "@/components/vault-deck";
import { RecipientField, ContactsPanel } from "@/components/contacts";
import { Button } from "@/components/ui/button";
import { Shell, Panel, Label, BindAccount, SignButton } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { useAccount } from "@/lib/account";
import { getAccount, hbar, ACCOUNT_RE, HASHSCAN } from "@/lib/hedera";
import { sendHbar, sendToken, armSwitch, deleteSchedule } from "@/lib/signer";
import { audit, checkSend, getLimits, setLimits, readAudit, type AuditEntry } from "@/lib/guard";
import { useEffect } from "react";
import { HBAR, LP_FEE, SERVICE_FEE, TREASURY, executeSwap, fmtUnits, listTokens, quote, toUnits, tokenBalance, type Step, type SwapToken } from "@/lib/swap";

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
      <VaultDeck pages={[
        { key: "holdings", label: "Holdings", icon: Wallet, content: <Dashboard id={id} tinybar={acct.data?.tinybar ?? null} view="holdings" /> },
        { key: "hbar", label: "HBAR", icon: Coins, content: <Panel><Label>HBAR balance</Label><p className="flex flex-wrap items-center gap-3 text-4xl font-semibold tnum">{acct.data ? hbar(acct.data.tinybar) : "—"}<HbarLogo size={36} /></p><p className="mt-4 font-mono text-sm text-muted-foreground">{id}</p><p className="mt-6 text-sm text-muted-foreground">Held in your Hedera account. Only you can sign a transfer.</p></Panel> },
        { key: "send", label: "Send", icon: ArrowUpRight, content: <Panel><Label>Send HBAR</Label><SendForm id={id} onSent={() => acct.refetch()} /></Panel> },
        { key: "receive", label: "Receive", icon: ArrowDownLeft, content: <Panel><Label>Your Hedera account</Label><div className="flex flex-col items-center py-5"><div className="rounded-lg bg-logo-surface p-4"><QRCodeSVG value={id} size={180} bgColor="transparent" /></div><p className="mt-6 font-mono text-xl tnum">{id}</p><Button variant="outline" className="mt-4" onClick={async () => { try { await navigator.clipboard.writeText(id); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied" : "Copy account ID"}</Button></div><p className="text-center text-xs text-muted-foreground">Hedera mainnet · HBAR and associated HTS tokens</p></Panel> },
        { key: "contacts", label: "Contacts", icon: BookUser, content: <ContactsPanel /> },
        { key: "swap", label: "Swap", icon: ArrowLeftRight, content: <SwapPanel id={id} onSwapped={() => acct.refetch()} /> },
        { key: "schedule", label: "Payments", icon: CalendarClock, content: <SchedulePanel id={id} /> },
        { key: "history", label: "Swap history", icon: History, content: <Dashboard id={id} tinybar={acct.data?.tinybar ?? null} view="history" /> },
        { key: "fees", label: "Fees", icon: Receipt, content: <Dashboard id={id} tinybar={acct.data?.tinybar ?? null} view="fees" /> },
        { key: "limits", label: "Limits", icon: ShieldCheck, content: <LimitsPanel /> },
        { key: "activity", label: "Activity", icon: History, content: <AuditPanel /> },
        { key: "cross-chain", label: "Cross-chain", icon: Globe, content: <ClprCard /> },
      ]} />
    </Shell>
  );
}

type Held = { token_id: string; balance: number; decimals?: number };
async function getHoldings(id: string): Promise<Held[]> {
  const r = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${id}/tokens?limit=100`);
  if (!r.ok) throw new Error(`Mirror node returned ${r.status}`);
  const j = await r.json();
  return (j.tokens ?? []) as Held[];
}
const metaCache = new Map<string, { symbol: string; name: string; decimals: number }>();
async function tokenMeta(tid: string) {
  if (metaCache.has(tid)) return metaCache.get(tid)!;
  const r = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${tid}`);
  const j = r.ok ? await r.json() : {};
  const m = { symbol: j.symbol ?? tid, name: j.name ?? "", decimals: Number(j.decimals ?? 0) };
  metaCache.set(tid, m);
  return m;
}

async function hbarUsd(): Promise<number> {
  const r = await fetch("https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate");
  if (!r.ok) throw new Error("Mirror node: exchange rate unavailable");
  const j = await r.json();
  return j.current_rate.cent_equivalent / j.current_rate.hbar_equivalent / 100;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 });

function Dashboard({ id, tinybar, view }: { id: string; tinybar: number | null; view: "holdings" | "history" | "fees" }) {
  const list = useQuery({ queryKey: ["swap-tokens"], queryFn: listTokens, staleTime: 10 * 60_000 });
  const rate = useQuery({ queryKey: ["hbar-usd"], queryFn: hbarUsd, refetchInterval: 60_000 });
  const held = useQuery({
    queryKey: ["holdings", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const rows = (await getHoldings(id)).filter((h) => h.balance > 0);
      return Promise.all(rows.map(async (h) => {
        const meta = await tokenMeta(h.token_id);
        const tok: SwapToken = { id: h.token_id, symbol: meta.symbol, name: meta.name, decimals: meta.decimals };
        let inHbar: number | null = null;
        try { inHbar = Number((await quote(tok, HBAR, BigInt(h.balance))).out) / 1e8; } catch { /* no pool */ }
        return { ...h, meta, inHbar };
      }));
    },
  });
  const [sending, setSending] = useState<string | null>(null);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [legacy, setLegacy] = useState<{ amount: number; expiry: string; heir: string } | null>(null);
  useEffect(() => {
    const load = () => { setAudits(readAudit()); try { setLegacy(JSON.parse(localStorage.getItem("aurion.legacy") ?? "null")); } catch { /* none */ } };
    load(); const t = setInterval(load, 3000); return () => clearInterval(t);
  }, []);

  const rows = held.data ?? [];
  const hb = tinybar != null ? tinybar / 1e8 : null;
  const tokHbar = rows.reduce((s, r) => s + (r.inHbar ?? 0), 0);
  const totalHbar = hb != null ? hb + tokHbar : null;
  const px = rate.data;
  const swaps = audits.filter((a) => a.action === "swap");
  const fees = audits.filter((a) => a.action === "swap fee" && a.ok);
  const feesPaid = fees.reduce((s, a) => s + (parseFloat(a.detail) || 0), 0);
  const days = legacy ? Math.max(0, Math.ceil((new Date(legacy.expiry).getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <>
      {view === "holdings" && <Panel>
        <Label>Total wallet value</Label>
        <p className="text-4xl font-semibold tnum">{totalHbar != null && px ? usd(totalHbar * px) : "—"}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground tnum"><span>≈ {totalHbar != null ? totalHbar.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</span><HbarLogo size={14} /></p>
        <p className="mt-1 text-xs text-muted-foreground">HBAR + your HTS tokens</p>

        <ul className="mt-4 divide-y divide-border">
          <li className="flex items-center gap-3 py-3">
            <HbarLogo size={28} />
            <div className="min-w-0 flex-1"><p className="font-semibold">HBAR</p><p className="text-xs text-muted-foreground">Hedera</p></div>
            <div className="text-right"><p className="font-semibold tnum">{tinybar != null ? hbar(tinybar) : "—"}</p><p className="text-xs text-muted-foreground tnum">{hb != null && px ? usd(hb * px) : ""}</p></div>
          </li>
          {rows.map((h) => {
            const t = list.data?.find((x) => x.id === h.token_id);
            const tok: SwapToken = t ?? { id: h.token_id, symbol: h.meta.symbol, name: h.meta.name, decimals: h.meta.decimals };
            const open = sending === h.token_id;
            return (
              <li key={h.token_id} className="py-3">
                <div className="flex items-center gap-3">
                  <TokIcon t={tok} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{tok.symbol}</p>
                    <a href={`${HASHSCAN}/token/${h.token_id}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground">{h.token_id}</a>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tnum">{fmtUnits(BigInt(h.balance), h.meta.decimals)}</p>
                    <p className="text-xs text-muted-foreground tnum">{h.inHbar != null && px ? usd(h.inHbar * px) : "no price"}</p>
                  </div>
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setSending(open ? null : h.token_id)}>{open ? "Close" : "Send"}</button>
                </div>
                {open && <TokenSend id={id} tok={tok} balance={BigInt(h.balance)} onSent={() => held.refetch()} />}
              </li>
            );
          })}
        </ul>
        {held.isError && <p className="text-xs text-destructive">Mirror node: could not load tokens.</p>}
        {!held.isLoading && rows.length === 0 && <p className="text-xs text-muted-foreground">No tokens yet. Anything you swap into shows up here.</p>}
      </Panel>}

        {view === "history" && <Panel>
          <Label>Swap history</Label>
          {swaps.length === 0 ? <p className="text-sm text-muted-foreground">No swaps yet.</p> : (
            <ul className="divide-y divide-border text-xs">
              {swaps.slice(0, 8).map((s, i) => (
                <li key={i} className="py-2">
                  <p className="flex justify-between gap-2"><span className={s.ok ? "text-success" : "text-destructive"}>{s.ok ? "Swapped" : "Failed"}</span><span className="text-muted-foreground tnum">{new Date(s.at).toLocaleDateString()}</span></p>
                  <p className="break-all text-muted-foreground">{s.detail}</p>
                  {s.txId && <a className="text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${s.txId}`}>View on HashScan</a>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground tnum">Service fees paid: {feesPaid.toFixed(4)} ℏ over {fees.length} swap{fees.length === 1 ? "" : "s"}</p>
        </Panel>}
        {view === "fees" && <Panel>
          <Label>Upcoming fees</Label>
          <dl className="space-y-2 text-xs tnum">
            <Row k="Next swap service fee" v={`${SERVICE_FEE * 100}% of the swap, in ℏ`} />
            <Row k="Network fee per action" v="≈ 0.001–0.5 ℏ" />
            <Row k="Token send network fee" v="≈ 0.001 ℏ" />
            {legacy ? <Row k={`Legacy transfer in ${days} day${days === 1 ? "" : "s"}`} v={`${legacy.amount} ℏ → ${legacy.heir}`} warn={days <= 3} /> : <Row k="Legacy transfer" v="Not set" />}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Nothing is charged until you sign. The Legacy transfer only happens if you don't check in.</p>
        </Panel>}
    </>
  );
}

function TokenSend({ id, tok, balance, onSent }: { id: string; tok: SwapToken; balance: bigint; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const units = toUnits(amt, tok.decimals);
  const over = units > balance;
  const ok = ACCOUNT_RE.test(to.trim()) && to.trim() !== id && units > 0n && !over;
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
      <RecipientField value={to} onChange={setTo} self={id} />
      <div className="relative">
        <input className="field tnum pr-20" inputMode="decimal" placeholder={`Amount ${tok.symbol}`} value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-signal" onClick={() => setAmt(String(Number(balance) / 10 ** tok.decimals))}>Max</button>
      </div>
      {over && <p className="text-xs text-destructive">Not enough {tok.symbol}.</p>}
      <p className="text-xs text-muted-foreground">The other wallet must already hold {tok.symbol} (or allow new tokens), or Hedera returns it.</p>
      <SignButton accountId={id} disabled={!ok} verb={ok ? `Send ${amt} ${tok.symbol}` : "Send"} run={async (pass) => {
        const dest = to.trim();
        const r = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${dest}?limit=1`);
        if (!r.ok) throw new Error("Recipient does not exist on mainnet");
        const detail = `${id} → ${dest} ${amt} ${tok.symbol}`;
        try {
          const txId = await sendToken(id, dest, tok.id, units, "", pass);
          audit({ action: "token send", detail, ok: true, txId });
          setAmt(""); setTimeout(onSent, 4000);
          return txId;
        } catch (e) { audit({ action: "token send", detail: `${detail} · ${(e as Error).message}`, ok: false }); throw e; }
      }} done={(txId) => (
        <>
          <p className="font-semibold text-success">Sent on Hedera</p>
          <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
        </>
      )} />
    </div>
  );
}

// Hedera holds a scheduled transfer for at most ~62 days, so repeats are scheduled ahead inside that window
// and topped up with "Schedule the next ones" when the user returns.
const SCHED_KEY = "aurion.scheduled";
const WINDOW_DAYS = 60;
type Freq = "once" | "daily" | "weekly" | "monthly";
type SchedPay = { scheduleId: string; to: string; amount: number; at: string; memo: string; series?: string | undefined; txId: string };
type Series = { id: string; to: string; amount: number; memo: string; freq: Exclude<Freq, "once">; next: string };
const readSched = (): { pays: SchedPay[]; series: Series[] } => { try { return { pays: [], series: [], ...JSON.parse(localStorage.getItem(SCHED_KEY) ?? "{}") }; } catch { return { pays: [], series: [] }; } };
const writeSched = (v: { pays: SchedPay[]; series: Series[] }) => localStorage.setItem(SCHED_KEY, JSON.stringify(v));
const step = (d: Date, f: Exclude<Freq, "once">) => { const n = new Date(d); if (f === "daily") n.setDate(n.getDate() + 1); else if (f === "weekly") n.setDate(n.getDate() + 7); else n.setMonth(n.getMonth() + 1); return n; };
const horizon = () => Date.now() + WINDOW_DAYS * 86_400_000;

async function payStatus(id: string): Promise<"waiting" | "sent" | "cancelled" | "failed"> {
  const r = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/schedules/${id}`);
  if (!r.ok) return "waiting";
  const j = await r.json();
  if (j.deleted) return "cancelled";
  if (j.executed_timestamp) {
    const t = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/transactions?timestamp=${j.executed_timestamp}`).then((x) => x.json()).catch(() => null);
    return t?.transactions?.[0]?.result === "SUCCESS" || !t ? "sent" : "failed";
  }
  return "waiting";
}

function SchedulePanel({ id }: { id: string }) {
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [memo, setMemo] = useState("");
  const [freq, setFreq] = useState<Freq>("once");
  const [when, setWhen] = useState("");
  const [data, setData] = useState<{ pays: SchedPay[]; series: Series[] }>({ pays: [], series: [] });
  const [progress, setProgress] = useState("");
  useEffect(() => { setData(readSched()); }, []);
  const save = (v: typeof data) => { writeSched(v); setData(v); };
  const statuses = useQuery({
    queryKey: ["sched-status", data.pays.map((p) => p.scheduleId).join()],
    queryFn: async () => Object.fromEntries(await Promise.all(data.pays.map(async (p) => [p.scheduleId, await payStatus(p.scheduleId)] as const))),
    enabled: data.pays.length > 0, refetchInterval: 30_000,
  });

  const min = new Date(Date.now() + 10 * 60_000), max = new Date(horizon());
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const at = when ? new Date(when) : null;
  const n = Number(amt);
  const dest = to.trim();
  const ok = ACCOUNT_RE.test(dest) && dest !== id && n > 0 && !!at && at >= min && at <= max;

  // Every date from `first` up to the 60-day window.
  const datesFrom = (first: Date, f: Freq) => { const out: Date[] = []; let d = first; while (d.getTime() <= horizon() && out.length < 12) { out.push(d); if (f === "once") break; d = step(d, f); } return out; };
  const scheduleAll = async (dates: Date[], payTo: string, amount: number, note: string, pass: string, series?: string) => {
    const made: SchedPay[] = [];
    for (const [i, d] of dates.entries()) {
      setProgress(`Scheduling payment ${i + 1} of ${dates.length}…`);
      const days = (d.getTime() - Date.now()) / 86_400_000;
      const r = await armSwitch(id, payTo, amount, days, pass, `aurion:v1 scheduled${note ? " · " + note.slice(0, 60) : ""}`);
      made.push({ scheduleId: r.scheduleId, to: payTo, amount, at: r.expiry, memo: note, series, txId: r.txId });
      audit({ action: "schedule", detail: `${amount} ℏ → ${payTo} on ${new Date(r.expiry).toLocaleString()} · ${r.scheduleId}`, ok: true, txId: r.txId });
    }
    setProgress("");
    return made;
  };

  const now = Date.now();
  const upcoming = data.pays.filter((p) => new Date(p.at).getTime() > now - 86_400_000 * 7).sort((a, b) => a.at.localeCompare(b.at));
  const due = data.series.filter((s) => new Date(s.next).getTime() <= horizon());
  const total = n > 0 && at ? datesFrom(at, freq).length : 0;

  return (
    <Panel className="mt-4">
      <Label>Scheduled payments</Label>
      <p className="mb-3 text-xs text-muted-foreground">Pick a date and Hedera sends the HBAR on its own — even if this app is closed. Keep enough HBAR in your account on the day.</p>
      <div className="space-y-3">
        <RecipientField value={to} onChange={setTo} self={id} />
        <div className="relative"><input className="field tnum pr-10" inputMode="decimal" placeholder="Amount ℏ" value={amt} onChange={(e) => setAmt(e.target.value)} /><HbarLogo size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" /></div>
        <div className="grid grid-cols-4 gap-2">
          {(["once", "daily", "weekly", "monthly"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFreq(f)} className={`rounded-xl border px-3 py-2 text-sm capitalize ${freq === f ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{f === "once" ? "One time" : f}</button>
          ))}
        </div>
        <div><p className="mb-1 text-xs text-muted-foreground">{freq === "once" ? "Send on" : "First payment on"}</p>
          <input type="datetime-local" className="field tnum" min={local(min)} max={local(max)} value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        <input className="field" maxLength={60} placeholder="Note, like Rent (optional)" value={memo} onChange={(e) => setMemo(e.target.value)} />
        {at && (at < min || at > max) && <p className="text-xs text-destructive">Pick a time between 10 minutes and {WINDOW_DAYS} days from now. Hedera can only hold a payment that long.</p>}
        {freq !== "once" && total > 0 && <p className="text-xs text-muted-foreground">This signs the next {total} {freq} payment{total === 1 ? "" : "s"} now, up to the {WINDOW_DAYS}-day window (capped at 12). Open the Vault now and then and tap "Schedule the next ones" to keep it going. Network fee ≈ 0.1 ℏ each.</p>}
        {freq === "once" && <p className="text-xs text-muted-foreground">Network fee ≈ 0.1 ℏ. You can cancel any time before it sends.</p>}
        {progress && <p className="animate-pulse text-xs text-signal">{progress}</p>}
        <SignButton accountId={id} disabled={!ok} verb={ok ? (freq === "once" ? `Schedule ${n} ℏ` : `Start ${freq} ${n} ℏ`) : "Schedule"} run={async (pass) => {
          const block = await checkSend(id, dest, n);
          if (block) throw new Error(block);
          const dates = datesFrom(at!, freq);
          const sid = freq === "once" ? undefined : crypto.randomUUID();
          const made = await scheduleAll(dates, dest, n, memo, pass, sid);
          const cur = readSched();
          const series = sid && freq !== "once" ? [...cur.series, { id: sid, to: dest, amount: n, memo, freq, next: step(dates[dates.length - 1]!, freq).toISOString() }] : cur.series;
          save({ pays: [...cur.pays, ...made], series });
          setAmt(""); setWhen(""); setMemo("");
          return made[0]!.txId;
        }} done={() => <p className="font-semibold text-success">Scheduled on Hedera</p>} />
      </div>

      {due.map((s) => {
        const dates = datesFrom(new Date(s.next), s.freq);
        return (
          <div key={s.id} className="mt-4 rounded-xl border border-primary/40 p-3">
            <p className="text-sm">Your {s.freq} {s.amount} ℏ to <span className="font-mono">{s.to}</span> has {dates.length} more payment{dates.length === 1 ? "" : "s"} ready to schedule.</p>
            <div className="mt-2"><SignButton accountId={id} verb="Schedule the next ones" run={async (pass) => {
              const made = await scheduleAll(dates, s.to, s.amount, s.memo, pass, s.id);
              const cur = readSched();
              save({ pays: [...cur.pays, ...made], series: cur.series.map((x) => x.id === s.id ? { ...x, next: step(dates[dates.length - 1]!, s.freq).toISOString() } : x) });
              return made[0]!.txId;
            }} done={() => <p className="font-semibold text-success">Scheduled.</p>} /></div>
          </div>
        );
      })}

      {data.series.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Repeating</p>
          {data.series.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="tnum">{s.amount} ℏ {s.freq} → <span className="font-mono">{s.to}</span>{s.memo && <span className="text-muted-foreground"> · {s.memo}</span>}</span>
              <button className="text-xs text-destructive" onClick={() => { if (confirm("Stop repeating? Payments already scheduled stay until you cancel them below.")) { const cur = readSched(); save({ ...cur, series: cur.series.filter((x) => x.id !== s.id) }); } }}>Stop</button>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <ul className="mt-4 divide-y divide-border text-sm">
          {upcoming.map((p) => {
            const st = statuses.data?.[p.scheduleId] ?? "waiting";
            return (
              <li key={p.scheduleId} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="tnum">{p.amount} ℏ → <span className="font-mono">{p.to}</span>{p.memo && <span className="text-muted-foreground"> · {p.memo}</span>}</p>
                    <p className="text-xs text-muted-foreground tnum">{new Date(p.at).toLocaleString()} · <a className="text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/schedule/${p.scheduleId}`}>{p.scheduleId}</a></p>
                  </div>
                  <span className={`shrink-0 text-xs ${st === "sent" ? "text-success" : st === "waiting" ? "text-signal" : "text-destructive"}`}>{st === "waiting" ? "Waiting" : st === "sent" ? "Sent" : st === "cancelled" ? "Cancelled" : "Failed"}</span>
                </div>
                {st === "waiting" && (
                  <div className="mt-2"><SignButton accountId={id} verb="Cancel this payment" run={async (pass) => {
                    await deleteSchedule(id, p.scheduleId, pass);
                    audit({ action: "schedule", detail: `Cancelled · ${p.scheduleId}`, ok: true });
                    statuses.refetch();
                    return p.scheduleId;
                  }} done={() => <p className="text-sm">Cancelled. Nothing will be sent.</p>} /></div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function ClprCard() {
  return (
    <Panel className="mt-4">
      <div className="flex items-center justify-between"><Label>Cross-chain sends · CLPR</Label><span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-signal">Coming soon</span></div>
      <p className="text-sm leading-relaxed">Send to other blockchains straight from your Vault. No bridges, no middlemen.</p>
      <p className="mt-2 text-xs text-muted-foreground">Powered by CLPR, Hedera's cross-ledger protocol. We'll switch this on as soon as it reaches mainnet.</p>
    </Panel>
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
      <RecipientField value={to} onChange={setTo} self={id} />
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

function TokenPick({ tokens, value, onPick, exclude }: { tokens: SwapToken[]; value: SwapToken; onPick: (t: SwapToken) => void; exclude: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = tokens.filter((t) => t.id !== exclude && (!q || `${t.symbol} ${t.name} ${t.id}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 80);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-semibold transition-colors hover:border-primary">
        <TokIcon t={value} /> {value.symbol} <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <input autoFocus className="field mb-3" placeholder={`Search ${tokens.length} tokens by name or 0.0.…`} value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="-mx-2 overflow-y-auto">
              {list.map((t) => (
                <li key={t.id}>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary" onClick={() => { onPick(t); setOpen(false); setQ(""); }}>
                    <TokIcon t={t} size={28} />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t.symbol} {t.verified && <span className="text-xs text-success">✓</span>}</span><span className="block truncate text-xs text-muted-foreground">{t.name}</span></span>
                    <span className="font-mono text-xs text-muted-foreground">{t.id === "HBAR" ? "" : t.id}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="p-3 text-sm text-muted-foreground">No token with an HBAR pool matches.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function TokIcon({ t, size = 20 }: { t: SwapToken; size?: number }) {
  const [bad, setBad] = useState(false);
  if (t.id === "HBAR") return <HbarLogo size={size} />;
  if (!t.icon || bad) return <span style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold">{t.symbol.slice(0, 2)}</span>;
  return <img src={t.icon} alt="" width={size} height={size} onError={() => setBad(true)} className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
}

const STEP_LABEL: Record<Step, string> = { approve: "Allowing the exchange to use your tokens…", associate: "Adding the token to your account…", swap: "Swapping…", fee: "Paying the service fee…", done: "Done" };

function SwapPanel({ id, onSwapped }: { id: string; onSwapped: () => void }) {
  const tokens = useQuery({ queryKey: ["swap-tokens"], queryFn: listTokens, staleTime: 10 * 60_000 });
  const all = tokens.data ?? [HBAR];
  const [tIn, setIn] = useState<SwapToken>(HBAR);
  const [tOut, setOut] = useState<SwapToken | null>(null);
  const out = tOut ?? all.find((t) => t.symbol === "USDC") ?? all[1] ?? null;
  const [amt, setAmt] = useState("");
  const slip = 0.03; // automatic, hidden tolerance so swaps go through smoothly
  const [step, setStep] = useState<Step | null>(null);
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(amt), 350); return () => clearTimeout(t); }, [amt]);
  const units = toUnits(debounced, tIn.decimals);
  const q = useQuery({ queryKey: ["quote", tIn.id, out?.id, units.toString()], queryFn: () => quote(tIn, out!, units), enabled: !!out && units > 0n, refetchInterval: 10_000, retry: false });
  const balIn = useQuery({ queryKey: ["tokbal", id, tIn.id], queryFn: () => tokenBalance(id, tIn), refetchInterval: 15_000 });
  const balOut = useQuery({ queryKey: ["tokbal", id, out?.id], queryFn: () => tokenBalance(id, out!), enabled: !!out, refetchInterval: 15_000 });
  const live = debounced === amt && q.data && q.data.amountIn === units ? q.data : null;
  const minOut = live ? (live.out * BigInt(Math.round((1 - slip) * 10000))) / 10000n : 0n;
  const over = balIn.data != null && units > balIn.data;
  const ok = !!live && !over;
  const flip = () => { if (!out) return; setIn(out); setOut(tIn); setAmt(""); };

  return (
    <Panel className="mt-4">
      <Label>Swap</Label>
      <div className="rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>You pay</span>
          <span className="flex items-center gap-2"><span className="tnum">Balance {balIn.data != null ? fmtUnits(balIn.data, tIn.decimals) : "0"}</span>
            <button type="button" className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-signal hover:bg-primary/15" onClick={() => {
              if (!balIn.data) return;
              // Keep 3 HBAR back for network and service fees when paying in HBAR.
              const max = tIn.id === "HBAR" ? balIn.data - 300_000_000n : balIn.data;
              if (max > 0n) setAmt(String(Number(max) / 10 ** tIn.decimals));
            }}>Max</button></span></div>
        <div className="mt-1 flex items-center gap-2">
          <input className="w-full min-w-0 bg-transparent text-2xl font-semibold tnum outline-none" inputMode="decimal" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} />
          <TokenPick tokens={all} value={tIn} exclude={out?.id ?? ""} onPick={(t) => { setIn(t); setAmt(""); }} />
        </div>
      </div>
      <div className="relative z-10 -my-3 flex justify-center">
        <button type="button" aria-label="Flip" onClick={flip} className="rounded-full border border-border bg-card px-3 py-1 text-signal transition-transform hover:rotate-180">⇅</button>
      </div>
      <div className="rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>You get</span><span className="tnum">Balance {out && balOut.data != null ? fmtUnits(balOut.data, out.decimals) : "0"}</span></div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`w-full min-w-0 truncate text-2xl font-semibold tnum ${live ? "" : "text-muted-foreground"}`}>{live && out ? fmtUnits(live.out, out.decimals) : units > 0n ? (q.isError ? "—" : "…") : "0"}</p>
          {out && <TokenPick tokens={all} value={out} exclude={tIn.id} onPick={(t) => { setOut(t); }} />}
        </div>
      </div>

      {q.isError && units > 0n && <p className="mt-3 text-xs text-destructive">{(q.error as Error).message}</p>}
      {over && <p className="mt-3 text-xs text-destructive">Not enough {tIn.symbol}.</p>}
      {live && out && (
        <dl className="mt-3 space-y-1.5 rounded-xl border border-border p-3 text-xs tnum">
          <Row k="Rate" v={`1 ${tIn.symbol} ≈ ${fmtUnits((live.out * 10n ** BigInt(tIn.decimals)) / live.amountIn, out.decimals)} ${out.symbol}`} />
          <Row k="Price impact" v={`${(live.impact * 100).toFixed(2)}%`} warn={live.impact > 0.03} />
          <Row k={`Pool fee (${(LP_FEE * 100).toFixed(1)}% × ${live.hops})`} v="included in rate" />
          <Row k={`AURION fee (${SERVICE_FEE * 100}%)`} v={`${fmtUnits(live.fee, 8)} ℏ`} />
          <Row k="Network fee" v={tIn.id === "HBAR" ? "≈ 0.3–0.5 ℏ" : "≈ 1–1.5 ℏ (plus ≈ 0.5 ℏ the first time you allow a token)"} />
          {tIn.id !== "HBAR" && Number(live.hbarValue) / 1e8 < 3 && <p className="text-destructive">This swap is worth less than the network fee to make it. Swapping a bigger amount is cheaper per HBAR.</p>}
          <p className="pt-1 text-muted-foreground">Route: {tIn.symbol} → {live.hops > 1 ? "HBAR → " : ""}{out.symbol} on SaucerSwap. Price refreshes every 10 seconds.</p>
        </dl>
      )}
      {step && step !== "done" && <p className="mt-3 animate-pulse text-xs text-signal">{STEP_LABEL[step]}</p>}

      <div className="mt-3">
        <SignButton accountId={id} disabled={!ok} verb={ok && out ? `Swap ${amt} ${tIn.symbol} for ${out.symbol}` : "Swap"} run={async (pass) => {
          if (!live || !out) throw new Error("No price yet");
          const detail = `${amt} ${tIn.symbol} → ${fmtUnits(live.out, out.decimals)} ${out.symbol}`;
          try {
            const r = await executeSwap(id, tIn, out, live, slip, pass, setStep);
            audit({ action: "swap", detail, ok: true, txId: r.swapTx });
            if (r.feeTx) audit({ action: "swap fee", detail: `${fmtUnits(live.fee, 8)} ℏ → ${TREASURY}`, ok: true, txId: r.feeTx });
            else if (id !== TREASURY) audit({ action: "swap fee", detail: `Fee transfer did not go through`, ok: false });
            setAmt(""); setTimeout(() => { onSwapped(); balIn.refetch(); balOut.refetch(); }, 3000);
            return r.swapTx;
          } catch (e) { audit({ action: "swap", detail: `${detail} · ${(e as Error).message}`, ok: false }); throw e; }
          finally { setStep(null); }
        }} done={(txId) => (
          <>
            <p className="font-semibold text-success">Swapped on Hedera</p>
            <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
          </>
        )} />
      </div>
      {tokens.isError && <p className="mt-2 text-xs text-destructive">{(tokens.error as Error).message}. Token list unavailable.</p>}
    </Panel>
  );
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className={warn ? "text-destructive" : ""}>{v}</dd></div>;
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
