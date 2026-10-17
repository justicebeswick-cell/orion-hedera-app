import { describe, expect, it } from "vitest";
import { EXCHANGES } from "@/lib/exchanges";

describe("Exchange destinations", () => {
  it.each([
    ["coinbase", "www.coinbase.com"],
    ["kraken", "www.kraken.com"],
    ["cryptocom", "crypto.com"],
    ["binanceus", "www.binance.us"],
    ["uphold", "uphold.com"],
  ])("opens %s on its own official domain", (id, hostname) => {
    const exchange = EXCHANGES.find((e) => e.id === id);
    expect(exchange).toBeDefined();
    if (!exchange) throw new Error(`Missing exchange ${id}`);
    const url = new URL(exchange.url);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe(hostname);
  });
  it("does not include removed exchanges", () => {
    expect(EXCHANGES.map((e) => e.id)).not.toContain("gemini");
    expect(EXCHANGES.map((e) => e.id)).not.toContain("moonpay");
  });
});