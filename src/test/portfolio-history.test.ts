import { describe, expect, it } from "vitest";
import { balanceChange, PORTFOLIO_RANGES, rangePoints, recordPoint, validPoints } from "@/lib/portfolio-history";
const now = 1_800_000_000_000;
const day = 86_400_000;
describe("Observed portfolio performance", () => {
  it("offers All alongside the five timeframes", () => { expect(PORTFOLIO_RANGES).toEqual(["1D", "1W", "1M", "3M", "1Y", "All"]); });
  it("All includes all recorded history, never future observations", () => {
    const points = [{ at: now - 800 * day, value: 10 }, { at: now, value: 20 }, { at: now + day, value: 30 }];
    expect(rangePoints(points, "All", now)).toEqual(points.slice(0, 2));
    expect(rangePoints(points, "1D", now)).toEqual([points[1]]);
  });
  it("never fabricates history before the first observation", () => { expect(recordPoint([], { at: now, value: 100 })).toEqual([{ at: now, value: 100 }]); });
  it("rejects invalid valuations", () => { expect(validPoints([{ at: now, value: -5 }, { at: now, value: Infinity }, { at: now, value: 0 }])).toEqual([{ at: now, value: 0 }]); });
  it("reports actual balance change and no percentage without a baseline", () => { expect(balanceChange([{ at: now - day, value: 100 }, { at: now, value: 125 }])).toBe(25); expect(balanceChange([{ at: now, value: 125 }])).toBeNull(); });
  it("keeps the real ten-second refresh observations", () => { expect(recordPoint([{ at: now, value: 100 }], { at: now + 10_000, value: 101 })).toEqual([{ at: now, value: 100 }, { at: now + 10_000, value: 101 }]); });
});