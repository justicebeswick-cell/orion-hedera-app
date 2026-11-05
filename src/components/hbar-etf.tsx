import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Day = { t: number; c: number; v: number };
const PERIODS = [
  { key: "Day", days: 1 },
  { key: "Week", days: 5 },
  { key: "Month", days: 21 },
  { key: "Year", days: 252 },
] as const;

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function periodStats(days: Day[], n: number) {
  if (!days.length) return null;
  const slice = days.slice(-n);
  const base = days[days.length - n - 1] ?? days[0];
  const last = days[days.length - 1];
  if (!base || !last) return null;
  const shares = slice.reduce((s, d) => s + d.v, 0);
  const dollars = slice.reduce((s, d) => s + d.v * d.c, 0);
  return { last: last.c, change: ((last.c - base.c) / base.c) * 100, shares, dollars, sessions: slice.length };
}

export function HbarEtf() {
  const [p, setP] = useState<(typeof PERIODS)[number]["key"]>("Day");
  const q = useQuery({
    queryKey: ["hbar-etf"],
    queryFn: async () => {
      const r = await fetch("/api/hbar-etf");
      if (!r.ok) throw new Error("ETF feed unreachable");
      return (await r.json()) as {
        name: string; price: number; days: Day[];
        holdings: { asOf: string; hbar: number; netAssets: number; shares: number } | null;
      };
    },
    refetchInterval: 60_000,
  });
  const s = q.data ? periodStats(q.data.days, PERIODS.find((x) => x.key === p)!.days) : null;
  const up = (s?.change ?? 0) >= 0;

  return (
    <section className="panel mt-5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">HBAR ETF · HBR</p>
      {q.isError ? (
        <p className="py-6 text-center text-sm text-destructive">ETF feed unreachable.</p>
      ) : !s ? (
        <div className="mt-3 h-28 animate-pulse rounded-xl bg-muted/30" />
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight tnum">{money(q.data!.price ?? s.last)}</p>
          <p className="mt-1 text-xs text-muted-foreground tnum">
            <span className={up ? "text-signal" : "text-destructive"}>{up ? "▲" : "▼"} {Math.abs(s.change).toFixed(2)}%</span>{" "}
            past {p.toLowerCase()} · {q.data!.name}
          </p>
          {q.data!.holdings && (
            <div className="stat-tile mt-4 p-3">
              <p className="text-[11px] text-muted-foreground">HBAR locked in the fund</p>
              <p className="mt-1 text-2xl font-semibold tnum">
                <span className="text-primary">ℏ</span> {Math.round(q.data!.holdings.hbar).toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground tnum">
                ${compact(q.data!.holdings.netAssets)} net assets · {compact(q.data!.holdings.shares)} shares · as of {q.data!.holdings.asOf}
              </p>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="stat-tile p-3">
              <p className="text-[11px] text-muted-foreground">Shares traded</p>
              <p className="mt-1 text-lg font-semibold tnum">{compact(s.shares)}</p>
            </div>
            <div className="stat-tile p-3">
              <p className="text-[11px] text-muted-foreground">Dollars traded</p>
              <p className="mt-1 text-lg font-semibold tnum">${compact(s.dollars)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{s.sessions} trading {s.sessions === 1 ? "day" : "days"} · Nasdaq data, may lag 15 min</p>
        </>
      )}
      <div className="mt-4 flex justify-between gap-1" role="tablist" aria-label="ETF period">
        {PERIODS.map((x) => (
          <button key={x.key} role="tab" aria-selected={p === x.key} onClick={() => setP(x.key)}
            className={`flex-1 rounded-full py-1.5 text-xs transition-colors ${p === x.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {x.key}
          </button>
        ))}
      </div>
    </section>
  );
}
