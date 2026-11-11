import { describe, it, expect } from "vitest";
import { tokenAmount, royaltyPercent, autoAssociateOn } from "@/lib/airdrops";
describe("airdrops", () => {
  it("uses token decimals", () => { expect(tokenAmount(1234500, 4)).toBe(123.45); expect(tokenAmount(7, "0")).toBe(7); });
  it("royalty percent", () => { expect(royaltyPercent({ numerator: 1, denominator: 20 })).toBe(5); });
  it("auto-associate only when unlimited", () => { expect(autoAssociateOn(-1)).toBe(true); expect(autoAssociateOn(10)).toBe(false); expect(autoAssociateOn(0)).toBe(false); });
});
