export type PortfolioPoint = { at: number; value: number };
export type BalanceCheckpoint = { at: number; hbar: number };
export type PriceCandle = { at: number; price: number };
export const PORTFOLIO_RANGES = ["1D", "1W", "1M", "3M", "1Y", "All"] as const;
export type PortfolioRange = typeof PORTFOLIO_RANGES[number];
const HOUR = 3_600_000;
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

/** Build up to ~28 historical balance checkpoint timestamps spanning 1D through All-time. */
export function buildCheckpoints(createdAt: number, now: number): number[] {
  const start = Math.max(0, Math.min(createdAt, now));
  const candidates = new Set<number>();
  if (start + 60_000 < now - HOUR) candidates.add(start + 60_000);
  const fixedOffsets = [
    4 * HOUR, 8 * HOUR, 12 * HOUR, 18 * HOUR,
    DAY, 2 * DAY, 4 * DAY, 7 * DAY,
    14 * DAY, 21 * DAY, 30 * DAY,
    45 * DAY, 60 * DAY, 75 * DAY, 90 * DAY,
  ];
  for (const off of fixedOffsets) {
    const ts = now - off;
    if (ts > start) candidates.add(ts);
  }
  const longEnd = now - 90 * DAY;
  if (longEnd > start + 7 * DAY) {
    const steps = 12;
    const span = longEnd - start;
    for (let i = 1; i < steps; i++) {
      candidates.add(Math.floor(start + (span * i) / steps));
    }
  }
  return [...candidates].sort((a, b) => a - b);
}

/** Combine historical HBAR/USD candles with on-chain HBAR balance checkpoints. */
export function reconstructPortfolioPoints(
  candles: PriceCandle[],
  checkpoints: BalanceCheckpoint[],
  now: number,
): PortfolioPoint[] {
  const sortedC = [...candles].filter((c) => Number.isFinite(c.at) && Number.isFinite(c.price) && c.price > 0 && c.at <= now).sort((a, b) => a.at - b.at);
  const sortedB = [...checkpoints].filter((b) => Number.isFinite(b.at) && Number.isFinite(b.hbar) && b.hbar >= 0 && b.at <= now).sort((a, b) => a.at - b.at);
  const firstB = sortedB[0];
  const lastB = sortedB.at(-1);
  const lastC = sortedC.at(-1);
  if (!firstB || !lastB || !lastC) return [];

  const points: PortfolioPoint[] = [];
  let bIdx = 0;
  for (const candle of sortedC) {
    if (candle.at < firstB.at - DAY) continue;
    while (bIdx + 1 < sortedB.length && (sortedB[bIdx + 1]?.at ?? Infinity) <= candle.at) {
      bIdx++;
    }
    const hbar = sortedB[bIdx]?.hbar ?? firstB.hbar;
    points.push({ at: candle.at, value: hbar * candle.price });
  }
  const lastPt = points.at(-1);
  const liveVal = lastB.hbar * lastC.price;
  if (!lastPt || now - lastPt.at > 60_000) {
    points.push({ at: now, value: liveVal });
  } else {
    points[points.length - 1] = { at: now, value: liveVal };
  }
  return validPoints(points);
}

/** Merge on-chain historical points with device-local live observations without losing older history. */
export function mergePortfolioHistory(chainPoints: PortfolioPoint[], localPoints: PortfolioPoint[]): PortfolioPoint[] {
  const chain = validPoints(chainPoints);
  const local = validPoints(localPoints);
  if (!chain.length) return local;
  if (!local.length) return chain;

  const merged: PortfolioPoint[] = [];
  for (const cp of chain) {
    const covered = local.some((lp) => Math.abs(lp.at - cp.at) <= 60_000);
    if (!covered) merged.push(cp);
  }
  merged.push(...local);
  return validPoints(merged);
}