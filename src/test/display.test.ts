import { afterEach, describe, expect, it } from "vitest";
import { hbar } from "@/lib/hedera";
import { fmtUnits } from "@/lib/swap";
import { fmtUsd, roundOn, setRound } from "@/lib/display";

afterEach(() => localStorage.clear());

describe("Hide decimals setting", () => {
  it("keeps every decimal when the setting is off", () => {
    setRound(false);
    expect(roundOn()).toBe(false);
    expect(hbar(31330734563574)).toBe("313,307.34563574");
  });

  it("shows whole numbers when the setting is on", () => {
    setRound(true);
    expect(roundOn()).toBe(true);
    expect(hbar(31330734563574)).toBe("313,307");
    expect(fmtUsd(313307.34)).toBe("$313,307");
    expect(fmtUnits(1234567n, 2)).toBe("12,345");
  });

  it("never rounds amounts under one down to zero", () => {
    setRound(true);
    expect(hbar(12345678)).toBe("0.12345678");
    expect(fmtUsd(0.42)).toBe("$0.42");
  });
});
