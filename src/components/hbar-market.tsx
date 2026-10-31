import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const RANGES = [
  { key: "1H", interval: "1m", limit: 60 },
  { key: "1D", interval: "15m", limit: 96 },
  { key: "1W", interval: "1h", limit: 168 },
  { key: "1M", interval: "4h", limit: 180 },
  { key: "3M", interval: "12h", limit: 180 },
  { key: "6M", interval: "1d", limit: 182 },
  { key: "1Y", interval: "1d", limit: 365 },
  { key: "5Y", interval: "1w", limit: 261 },
  { key: "All", interval: "1w", limit: 1000 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

type Pt = { t: number; p: number };

// Public market-data mirror: free, CORS-enabled, not region-blocked.
async function fetchCandles(interval: string, limit: number): Promise<Pt[]> {
  const r = await fetch(
    `https://data-api.binance.vision/api/v3/klines?symbol=HBARUSDT&interval=${interval}&limit=${limit}`,
  );
  if (!r.ok) throw new Error("Price feed unreachable.");
  const rows = (await r.json()) as [number, string, string, string, string][];
  return rows.map((k) => ({ t: k[0], p: Number(k[4]) }));
}

const fmtPrice = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(3)}`;
const fmtTime = (t: number, key: RangeKey) =>
  new Date(t).toLocaleString(undefined,
    key === "1H" || key === "1D"
      ? { hour: "numeric", minute: "2-digit" }
      : key === "1W" || key === "1M"
        ? { month: "short", day: "numeric", hour: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" });

const W = 320;
const H = 120;

export function HbarMarket() {
  const [range, setRange] = useState<RangeKey>("1D");
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const cfg = RANGES.find((r) => r.key === range)!;
  const q = useQuery({
    queryKey: ["hbar-market", range],
    queryFn: () => fetchCandles(cfg.interval, cfg.limit),
    refetchInterval: range === "1H" ? 30000 : 120000,
    staleTime: 20000,
  });
  const pts = q.data ?? [];

  const geo = useMemo(() => {
    if (pts.length < 2) return null;
    const ps = pts.map((x) => x.p);
    const min = Math.min(...ps);
    const max = Math.max(...ps);
    const span = max - min || 1;
    const xy: [number, number][] = pts.map((x, i) => [
      (i / (pts.length - 1)) * W,
      H - 8 - ((x.p - min) / span) * (H - 16),
    ]);
    const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
    return { xy, line, area: `${line}L${W},${H}L0,${H}Z` };
  }, [pts]);

  const last = pts.at(-1)?.p;
  const first = pts[0]?.p;
  const shown = hover != null ? pts[hover] : pts.at(-1);
  const change = last && first ? ((((shown?.p ?? last) - first) / first) * 100) : null;
  const up = (change ?? 0) >= 0;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pts.length) return;
    const b = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
    setHover(Math.round(f * (pts.length - 1)));
  };

  return (
    <section className="panel mt-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">HBAR market</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tnum">
            {shown ? fmtPrice(shown.p) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground tnum">
            {change != null && (
              <span className={up ? "text-signal" : "text-destructive"}>
                {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            )}{" "}
            {hover != null && shown ? fmtTime(shown.t, range) : range === "All" ? "all time" : `past ${range}`}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-[120px] text-signal">
        {q.isError ? (
          <p className="pt-10 text-center text-sm text-destructive">Price feed unreachable.</p>
        ) : geo ? (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full touch-pan-y transition-opacity duration-300"
            style={{ opacity: q.isFetching && !q.isRefetching ? 0.4 : 1 }}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}
          >
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={geo.area} fill={`url(#${gid})`} />
            <path d={geo.line} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {hover != null && geo.xy[hover] && (
              <>
                <line x1={geo.xy[hover][0]} x2={geo.xy[hover][0]} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
                <circle cx={geo.xy[hover][0]} cy={geo.xy[hover][1]} r="3.5" fill="currentColor" />
              </>
            )}
          </svg>
        ) : (
          <div className="h-full w-full animate-pulse rounded-xl bg-muted/30" />
        )}
      </div>

      <div className="mt-4 flex justify-between gap-1" role="tablist" aria-label="Price range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            onClick={() => { setRange(r.key); setHover(null); }}
            className={`rounded-full px-2 py-1 text-[11px] font-medium tnum transition-colors ${
              range === r.key ? "bg-signal/15 text-signal" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.key}
          </button>
        ))}
      </div>
    </section>
  );
}
