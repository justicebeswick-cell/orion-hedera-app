import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchExchangeRates, positivePrice } from "@/lib/exchange-rates";

afterEach(() => vi.unstubAllGlobals());

function mockMarkets() {
  const fetcher = vi.fn(async (url: string) => {
    const data = url.includes("uphold") ? { ask: "0.0854429304", bid: "0.0852735318" }
      : url.includes("coinbase") ? { data: { amount: "0.085" } }
      : url.includes("kraken") ? { result: { HBARUSD: { a: ["0.086"] } } }
      : url.includes("crypto.com") ? { result: { data: [{ k: "0.087" }] } }
      : { askPrice: "0.088" };
    return Response.json(data);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("HBAR exchange pricing", () => {
  it("includes Uphold's own live ask, not its bid or another exchange's price", async () => {
    const fetcher = mockMarkets();
    const feed = await fetchExchangeRates();
    expect(feed.rates.find((r) => r.id === "uphold")?.price).toBe(0.0854429304);
    expect(fetcher).toHaveBeenCalledWith("https://api.uphold.com/v0/ticker/HBAR-USD", expect.objectContaining({ cache: "no-store" }));
  });
  it("excludes Gemini from the exchange feed", async () => {
    mockMarkets();
    expect((await fetchExchangeRates()).rates.map((r) => r.id)).not.toContain("gemini");
  });
  it("excludes MoonPay from the exchange feed and makes no quote requests", async () => {
    const fetcher = mockMarkets();
    expect((await fetchExchangeRates()).rates.map((r) => r.id)).not.toContain("moonpay");
    expect(fetcher.mock.calls.some(([url]) => url.includes("moonpay"))).toBe(false);
  });
  it("fetches prices again on a refresh rather than reusing old results", async () => {
    const fetcher = mockMarkets();
    await fetchExchangeRates();
    await fetchExchangeRates();
    expect(fetcher.mock.calls.filter(([url]) => url.includes("uphold"))).toHaveLength(2);
  });
  it("keeps failed feeds unavailable rather than displaying made-up prices", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await fetchExchangeRates()).rates.every((r) => r.price === null)).toBe(true);
    expect(positivePrice(null)).toBeNull();
    expect(positivePrice(-1)).toBeNull();
    expect(positivePrice("NaN")).toBeNull();
  });
});