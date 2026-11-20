export type PortfolioPoint = { at: number; value: number };
export const PORTFOLIO_RANGES = ["1D", "1W", "1M", "3M", "1Y", "All"] as const;
export type PortfolioRange = typeof PORTFOLIO_RANGES[number];
const DAY = 86_400_000;
const days: Record<Exclude<PortfolioRange, "All">, number> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365 };

export function validPoints(input: unknown): PortfolioPoint[] {
  if (!Array.isArray(input)) return [];
  return input.filter((p): p is PortfolioPoint => !!p && Number.isFinite(p.at) && p.at > 0 && Number.isFinite(p.value) && p.value >= 0).sort((a, b) => a.at - b.at);
}

/** Record real observations only; compact older observations to daily closes. */
export function recordPoint(points: PortfolioPoint[], point: PortfolioPoint): PortfolioPoint[] {
  if (!validPoints([point]).length) return points;
  const buckets = new Map<number, PortfolioPoint>();
  for (const p of [...points, point]) {
    const interval = p.at < point.at - 30 * DAY ? DAY : p.at < point.at - DAY ? 300_000 : 10_000;
    buckets.set(Math.floor(p.at / interval) * interval, p);
  }
  return [...buckets.values()].sort((a, b) => a.at - b.at);
}

export function rangePoints(points: PortfolioPoint[], range: PortfolioRange, now: number): PortfolioPoint[] {
  return points.filter((p) => p.at <= now && (range === "All" || p.at >= now - days[range] * DAY));
}

export function balanceChange(points: PortfolioPoint[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (points.length < 2 || !first || !last || first.value === 0) return null;
  return (last.value - first.value) / first.value * 100;
}