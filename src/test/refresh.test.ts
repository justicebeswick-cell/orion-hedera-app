import { describe, it, expect, vi, afterEach } from "vitest";
import { REFRESH_MS } from "@/lib/refresh";
import { hbarUsdLive } from "@/lib/hedera";

describe("wallet refresh cadence", () => {
  it("refreshes wallet data every 10 seconds", () => {
    expect(REFRESH_MS).toBe(10_000);
  });
});

describe("hbarUsdLive", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the live market price when the feed answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      Response.json(url.includes("ticker/price") ? { price: "0.2468" } : {}),
    ));
    await expect(hbarUsdLive()).resolves.toBe(0.2468);
  });

  it("falls back to the network's own rate when the market feed is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("ticker/price")) throw new Error("feed down");
      return Response.json({ current_rate: { cent_equivalent: 10, hbar_equivalent: 1 } });
    }));
    await expect(hbarUsdLive()).resolves.toBe(0.1);
  });

  it("falls back to the network's own rate when the feed returns no price", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("ticker/price")) return Response.json({ price: "not-a-number" });
      return Response.json({ current_rate: { cent_equivalent: 10, hbar_equivalent: 1 } });
    }));
    await expect(hbarUsdLive()).resolves.toBe(0.1);
  });
});
