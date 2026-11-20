import { useEffect, useId, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { fmtUsd } from "@/lib/display";
import { balanceChange, PORTFOLIO_RANGES, rangePoints, recordPoint, validPoints, type PortfolioPoint, type PortfolioRange } from "@/lib/portfolio-history";

export function PortfolioPerformance({ accountId, value, hidden }: { accountId: string; value: number | null; hidden: boolean }) {
  const [points, setPoints] = useState<PortfolioPoint[]>([]);
  const [range, setRange] = useState<PortfolioRange>("1M");
  const gradient = useId().replace(/:/g, "");
  useEffect(() => {
    try { setPoints(validPoints(JSON.parse(localStorage.getItem(`orion.performance.${accountId}`) ?? "[]"))); }
    catch { setPoints([]); }
  }, [accountId]);
  useEffect(() => {
    if (value === null || !Number.isFinite(value)) return;
    setPoints((previous) => {
      const next = recordPoint(previous, { at: Date.now(), value });
      try { localStorage.setItem(`orion.performance.${accountId}`, JSON.stringify(next)); } catch { /* chart still works if storage is full */ }
      return next;
    });
    const timer = window.setInterval(() => {
      setPoints((previous) => {
        const next = recordPoint(previous, { at: Date.now(), value });
        try { localStorage.setItem(`orion.performance.${accountId}`, JSON.stringify(next)); } catch { /* storage unavailable */ }
        return next;
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [accountId, value]);
  const visible = rangePoints(points, range, Date.now());
  const change = balanceChange(visible);
  return <section className="portfolio-performance" aria-label="Portfolio performance">
    <div className="performance-caption flex min-h-6 items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">Portfolio performance</span>
      {!hidden && change !== null && <span className={`tnum ${change >= 0 ? "text-success" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>}
    </div>
    <div className={`portfolio-plot ${hidden || visible.length < 2 ? "portfolio-plot-empty" : ""}`} role="img" aria-label={hidden ? "Portfolio balance hidden" : `Portfolio value, ${range} timeframe, ${visible.length} observations`}>
      {!hidden && visible.length > 1 ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{ top: 12, right: 6, bottom: 0, left: 6 }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} /></linearGradient></defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PortfolioPoint | undefined;
            return active && point ? <div className="performance-tooltip"><p className="font-medium tnum">{fmtUsd(point.value)}</p><p className="text-[11px] text-muted-foreground">{new Date(point.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div> : null;
          }} />
          <Area type="monotone" dataKey="value" stroke="var(--chart-line)" strokeWidth={1.7} fill={`url(#${gradient})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"><span className="performance-baseline" /><span>{hidden ? "Balance hidden" : "Your performance history starts here"}</span></div>}
    </div>
    <div className="performance-ranges" role="group" aria-label="Portfolio timeframe">{PORTFOLIO_RANGES.map((r) => <Button key={r} size="sm" variant="ghost" aria-pressed={range === r} onClick={() => setRange(r)} className={range === r ? "performance-range is-selected" : "performance-range"}>{r}</Button>)}</div>
    {!hidden && <p className="performance-note text-[10px] text-muted-foreground">Since tracking on this device · Includes deposits and withdrawals</p>}
  </section>;
}