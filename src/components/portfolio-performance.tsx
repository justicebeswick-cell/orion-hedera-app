import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { fmtUsd } from "@/lib/display";
import { balanceChange, PORTFOLIO_RANGES, rangePoints, type PortfolioPoint, type PortfolioRange } from "@/lib/portfolio-history";
import { usePortfolioHistory } from "@/lib/use-portfolio-history";

export function PortfolioPerformance({ accountId, hidden, range, onRangeChange, hideCaption }: { accountId: string; hidden: boolean; range: PortfolioRange; onRangeChange: (range: PortfolioRange) => void; hideCaption?: boolean }) {
  const points = usePortfolioHistory(accountId);
  const gradient = useId().replace(/:/g, "");
  const visible = rangePoints(points, range, Date.now());
  const change = balanceChange(visible);
  return <section className="portfolio-performance" aria-label="Portfolio performance">
    {!hideCaption && <div className="performance-caption flex min-h-6 items-center justify-start gap-2 text-xs">
      {!hidden && <span className={`performance-change tnum ${change === null ? "text-muted-foreground" : change >= 0 ? "text-success" : "text-destructive"}`}>{change === null ? "0.00" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}`}%</span>}
      <span className="text-muted-foreground">{range === "All" ? "All time" : `Past ${range}`}</span>
    </div>}
    <div className="portfolio-plot" role="img" aria-label={hidden ? "Portfolio balance hidden" : `Portfolio value, ${range} timeframe, ${visible.length} observations`}>
      {!hidden && visible.length > 1 ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{ top: 12, right: 6, bottom: 0, left: 6 }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.2} /><stop offset="55%" stopColor="var(--chart-line)" stopOpacity={0.06} /><stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} /></linearGradient></defs>
          <XAxis hide dataKey="at" type="number" domain={["dataMin", "dataMax"]} />
          <YAxis hide domain={[(minimum: number) => Math.max(0, minimum - Math.max(1, minimum * 0.015)), (maximum: number) => maximum + Math.max(1, maximum * 0.015)]} />
          <Tooltip cursor={{ stroke: "var(--glass-edge)", strokeDasharray: "3 5" }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PortfolioPoint | undefined;
            return active && point ? <div className="performance-tooltip"><p className="font-medium tnum">{fmtUsd(point.value)}</p><p className="text-[11px] text-muted-foreground">{new Date(point.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div> : null;
          }} />
          <Area type="monotone" dataKey="value" stroke="var(--chart-line)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill={`url(#${gradient})`} activeDot={{ r: 3, fill: "var(--chart-line)", stroke: "var(--background)", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer> : <>
        <svg className="performance-empty-line" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`${gradient}-empty`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} /></linearGradient></defs><path d="M0 115H600V200H0Z" fill={`url(#${gradient}-empty)`} /><path d="M0 115H600" stroke="var(--chart-line)" strokeWidth="1.5" strokeOpacity={0.45} /></svg>
        <div className="performance-empty">{hidden ? "Balance hidden" : "Awaiting performance history"}</div>
      </>}
    </div>
    <div className="performance-ranges" role="group" aria-label="Portfolio timeframe">{PORTFOLIO_RANGES.map((r) => <Button key={r} size="sm" variant="ghost" aria-pressed={range === r} onClick={() => onRangeChange(r)} className={range === r ? "performance-range is-selected" : "performance-range"}>{r}</Button>)}</div>
    {!hidden && <p className="performance-note text-[10px] text-muted-foreground">Since tracking on this device · Includes deposits and withdrawals</p>}
  </section>;
}