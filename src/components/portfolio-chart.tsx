import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fmtUsd } from "@/lib/display";

const RANGES = [
  { key: "1H", interval: "1m", limit: 60 },
  { key: "1D", interval: "15m", limit: 96 },
  { key: "1W", interval: "1h", limit: 168 },
  { key: "1M", interval: "4h", limit: 180 },
  { key: "1Y", interval: "1d", limit: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];
type Pt = { t: number; p: number };

async function candles(interval: string, limit: number): Promise<Pt[]> {
  const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=HBARUSDT&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error("Price feed unreachable.");
  const rows = (await r.json()) as [number, string, string, string, string][];
  return rows.map((k) => ({ t: k[0], p: Number(k[4]) }));
}

const stamp = (t: number, k: RangeKey) =>
  new Date(t).toLocaleString(undefined, k === "1H" || k === "1D" ? { hour: "numeric", minute: "2-digit" } : k === "1Y" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" });

const W = 320, H = 72;

/** Portfolio value over time at today's holdings (HBAR-equivalent × HBAR price). */
export function PortfolioChart({ totalHbar }: { totalHbar: number | null }) {
  const [range, setRange] = useState<RangeKey>("1D");
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const cfg = RANGES.find((r) => r.key === range)!;
  const q = useQuery({ queryKey: ["hbar-market", range], queryFn: () => candles(cfg.interval, cfg.limit), refetchInterval: 60000, staleTime: 20000 });
  const pts = useMemo(() => (q.data ?? []).map((x) => ({ t: x.t, p: x.p * (totalHbar ?? 0) })), [q.data, totalHbar]);

  const geo = useMemo(() => {
    if (pts.length < 2 || !totalHbar) return null;
    const ps = pts.map((x) => x.p);
    const min = Math.min(...ps), span = Math.max(...ps) - min || 1;
    const xy = pts.map((x, i) => [(i / (pts.length - 1)) * W, H - 4 - ((x.p - min) / span) * (H - 8)] as [number, number]);
    const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
    return { xy, line, area: `${line}L${W},${H}L0,${H}Z` };
  }, [pts, totalHbar]);

  const first = pts[0]?.p, last = pts.at(-1)?.p;
  const shown = hover != null ? pts[hover] : pts.at(-1);
  const change = first && shown ? ((shown.p - first) / first) * 100 : null;
  const up = first && last ? last >= first : true;
  const mid = pts[Math.floor(pts.length / 2)];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pts.length) return;
    const b = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)) * (pts.length - 1)));
  };

  return (
    <div className="mt-4">
      <p className="text-center text-xs tnum text-muted-foreground">
        {change != null && <span className={change >= 0 ? "text-success" : "text-destructive"}>{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%</span>}
        {" "}{hover != null && shown ? `${fmtUsd(shown.p)} · ${stamp(shown.t, range)}` : `past ${range}`}
      </p>
      <div className={`mt-2 h-[72px] ${up ? "text-success" : "text-destructive"}`}>
        {geo ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full touch-pan-y" aria-label="Portfolio value chart"
            onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}>
            <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.22" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d={geo.area} fill={`url(#${gid})`} />
            <path d={geo.line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {hover != null && geo.xy[hover] && <>
              <line x1={geo.xy[hover][0]} x2={geo.xy[hover][0]} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" />
              <circle cx={geo.xy[hover][0]} cy={geo.xy[hover][1]} r="3" fill="currentColor" />
            </>}
          </svg>
        ) : q.isError ? <p className="pt-6 text-center text-xs text-destructive">Price feed unreachable.</p> : <div className="h-full animate-pulse rounded-lg bg-muted/30" />}
      </div>
      {pts.length > 1 && (
        <div className="mt-1 flex justify-between text-[10px] tnum text-muted-foreground">
          <span>{stamp(pts[0]!.t, range)}</span><span>{mid && stamp(mid.t, range)}</span><span>{stamp(pts.at(-1)!.t, range)}</span>
        </div>
      )}
      <div className="mt-3 flex justify-center gap-1" role="tablist" aria-label="Chart range">
        {RANGES.map((r) => (
          <button key={r.key} type="button" role="tab" aria-selected={range === r.key} onClick={() => { setRange(r.key); setHover(null); }}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium tnum transition-colors ${range === r.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {r.key}
          </button>
        ))}
      </div>
    </div>
  );
}
