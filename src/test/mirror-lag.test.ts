import { afterEach, describe, expect, it, vi } from "vitest";
import { getLag } from "@/lib/hedera";

describe("mirror freshness", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("does not report two minutes of lag when the device clock is fast", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_000);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ transactions: [{ consensus_timestamp: "1700000000.000000000" }] }))
      .mockResolvedValueOnce(new Response(null, { headers: { date: new Date(1_700_000_003_000).toUTCString() } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(getLag()).resolves.toBe(3);
    expect(fetcher).toHaveBeenNthCalledWith(2, "/", expect.objectContaining({ method: "HEAD", cache: "no-store" }));
  });

  it("still reports a genuine two-minute delay", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { transactions: [{ consensus_timestamp: "1700000000.000000000" }] },
      { headers: { date: new Date(1_700_000_123_000).toUTCString() } },
    )));
    await expect(getLag()).resolves.toBe(123);
  });

  it("rejects missing transaction timestamps rather than treating them as epoch zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ transactions: [] })));
    await expect(getLag()).rejects.toThrow("latest timestamp unavailable");
  });

  it("does not fall back to an untrusted device clock if HTTP time is missing", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ transactions: [{ consensus_timestamp: "1700000000" }] }))
      .mockResolvedValueOnce(new Response(null)));
    await expect(getLag()).rejects.toThrow("time reference unavailable");
  });
});