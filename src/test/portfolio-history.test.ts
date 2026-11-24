import { describe, expect, it } from "vitest";
import { balanceChange, buildCheckpoints, mergePortfolioHistory, PORTFOLIO_RANGES, rangePoints, reconstructPortfolioPoints, recordPoint, validPoints } from "@/lib/portfolio-history";
const now = 1_800_000_000_000;
const day = 86_400_000;
describe("Observed portfolio performance", () => {
  it("offers All alongside the five timeframes", () => { expect(PORTFOLIO_RANGES).toEqual(["1D", "1W", "1M", "3M", "1Y", "All"]); });
  it("All includes all recorded history, never future observations", () => {
    const points = [{ at: now - 800 * day, value: 10 }, { at: now, value: 20 }, { at: now + day, value: 30 }];
    expect(rangePoints(points, "All", now)).toEqual(points.slice(0, 2));
    expect(rangePoints(points, "1D", now)).toEqual([{ at: now, value: 20 }]);
  });
  it("never fabricates history before the first observation", () => { expect(recordPoint([], { at: now, value: 100 })).toEqual([{ at: now, value: 100 }]); });
  it("rejects invalid valuations", () => { expect(validPoints([{ at: now, value: -5 }, { at: now, value: Infinity }, { at: now, value: 0 }])).toEqual([{ at: now, value: 0 }]); });
  it("reports actual balance change and no percentage without a baseline", () => { expect(balanceChange([{ at: now - day, value: 100 }, { at: now, value: 125 }])).toBe(25); expect(balanceChange([{ at: now, value: 125 }])).toBeNull(); });
  it("keeps the real ten-second refresh observations", () => { expect(recordPoint([{ at: now, value: 100 }], { at: now + 10_000, value: 101 })).toEqual([{ at: now, value: 100 }, { at: now + 10_000, value: 101 }]); });
  it("reconstructs portfolio value from historical balance checkpoints and HBAR candles", () => {
    const candles = [
      { at: now - 10 * day, price: 0.1 },
      { at: now - 5 * day, price: 0.2 },
      { at: now - day, price: 0.25 },
    ];
    const checkpoints = [
      { at: now - 10 * day, hbar: 1000 },
      { at: now - 3 * day, hbar: 2000 },
      { at: now, hbar: 2000 },
    ];
    const pts = reconstructPortfolioPoints(candles, checkpoints, now);
    expect(pts).toEqual([
      { at: now - 10 * day, value: 100 },
      { at: now - 5 * day, value: 200 },
      { at: now - day, value: 500 },
      { at: now, value: 500 },
    ]);
  });
  it("builds bounded checkpoints spanning account creation to now", () => {
    const cps = buildCheckpoints(now - 500 * day, now);
    expect(cps.length).toBeGreaterThan(15);
    expect(cps.length).toBeLessThanOrEqual(30);
    expect(cps[0]).toBeGreaterThan(now - 500 * day);
    expect(cps.at(-1)).toBeLessThan(now);
  });
  it("merges on-chain history with newer live device observations", () => {
    const chain = [{ at: now - 10 * day, value: 100 }, { at: now - 30_000, value: 150 }];
    const local = [{ at: now - 20_000, value: 155 }, { at: now, value: 160 }];
    expect(mergePortfolioHistory(chain, local)).toEqual([
      { at: now - 10 * day, value: 100 },
      { at: now - 20_000, value: 155 },
      { at: now, value: 160 },
    ]);
  });
});