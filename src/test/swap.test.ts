import { afterEach, describe, expect, it, vi } from "vitest";
import { HBAR, listTokens, routesOf, tokenBalance, toUnits, quote, executeSwap } from "@/lib/swap";

const token = (id: string, symbol = id) => ({ id, symbol, name: symbol, decimals: 6 });
const pool = (a: string, b: string) => ({ tokenA: token(a), tokenB: token(b), tokenReserveA: "1000000", tokenReserveB: "1000000", lpTokenReserve: "100", lpToken: { priceUsd: "1" } });
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("HTS swap routing and safety", () => {
  it("keeps active HTS markets even without HBAR connectivity or a TVL threshold", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([pool("0.0.100", "0.0.101")])));
    const tokens = await listTokens();
    expect(tokens.map((t) => t.id)).toEqual(["HBAR", "0.0.100", "0.0.101"]);
    expect(await routesOf(token("0.0.100"), token("0.0.101"))).toEqual([["0.0.100", "0.0.101"]]);
  });
  it("includes a non-hub route alongside an HBAR hub route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      pool("0.0.100", "0.0.1456986"), pool("0.0.1456986", "0.0.101"),
      pool("0.0.100", "0.0.102"), pool("0.0.102", "0.0.101"),
    ])));
    await listTokens();
    expect(await routesOf(token("0.0.100"), token("0.0.101"))).toContainEqual(["0.0.100", "0.0.102", "0.0.101"]);
  });
  it("does not mistake a mirror error for a missing association", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 503)));
    await expect(tokenBalance("0.0.123", token("0.0.100"))).rejects.toThrow("Hedera returned 503");
  });
  it("only treats a successful empty token lookup as unassociated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ tokens: [] })));
    expect(await tokenBalance("0.0.123", token("0.0.100"))).toBeNull();
  });
  it("keeps exact HTS smallest units", () => {
    expect(toUnits("123456789.123456", 6)).toBe(123456789123456n);
  });
  it("rejects zero-input quotes", async () => {
    await expect(quote(HBAR, token("0.0.100"), 0n)).rejects.toThrow("greater than zero");
  });
  it("blocks an insufficient HTS balance before any signing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ tokens: [{ balance: 1 }] })));
    await expect(executeSwap("0.0.123", token("0.0.100", "TEST"), HBAR, {
      amountIn: 2n, out: 1n, hbarValue: 1n, fee: 0n, impact: 0, hops: 1, path: ["0.0.100", "0.0.1456986"], route: ["TEST", "HBAR"],
    }, 0.03, "")).rejects.toThrow("not enough TEST");
  });
});