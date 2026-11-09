import { afterEach, describe, expect, it, vi } from "vitest";
import { getLag } from "@/lib/hedera";

describe("mirror freshness", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("does not report two minutes of lag when the device clock is fast", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_000);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ blocks: [{ timestamp: { to: "1700000000.000000000" } }] }))
      .mockResolvedValueOnce(new Response(null, { headers: { date: new Date(1_700_000_003_000).toUTCString() } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(getLag()).resolves.toBe(3);
    expect(fetcher).toHaveBeenNthCalledWith(2, expect.stringMatching(/^\/\?mirror-clock=/), expect.objectContaining({ method: "HEAD", cache: "no-store" }));
  });

  it("still reports a genuine two-minute delay", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { blocks: [{ timestamp: { to: "1700000000.000000000" } }] },
      { headers: { date: new Date(1_700_000_123_000).toUTCString() } },
    )));
    await expect(getLag()).resolves.toBe(123);
  });

  it("rejects missing transaction timestamps rather than treating them as epoch zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ blocks: [] })));
    await expect(getLag()).rejects.toThrow("latest timestamp unavailable");
  });

  it("does not fall back to an untrusted device clock if HTTP time is missing", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ blocks: [{ timestamp: { to: "1700000000" } }] }))
      .mockResolvedValueOnce(new Response(null)));
    await expect(getLag()).rejects.toThrow("time reference unavailable");
  });

  it("uses distinct supported cache keys for repeated mirror and clock reads", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) => Promise.resolve(
      url.startsWith("/")
        ? new Response(null, { headers: { date: new Date(1_700_000_003_000).toUTCString() } })
        : Response.json({ blocks: [{ timestamp: { to: "1700000000" } }] }),
    ));
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.123456789).mockReturnValueOnce(0.987654321);
    await expect(getLag()).resolves.toBe(3);
    await expect(getLag()).resolves.toBe(3);
    expect(fetcher.mock.calls[0]?.[0]).toContain("/blocks?limit=1&order=desc&timestamp=gte:0.123456789");
    expect(fetcher.mock.calls[2]?.[0]).toContain("timestamp=gte:0.987654321");
    expect(fetcher.mock.calls[1]?.[0]).not.toBe(fetcher.mock.calls[3]?.[0]);
  });

  it("preserves a genuine four-minute ingestion warning", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { blocks: [{ timestamp: { to: "1700000000" } }] },
      { headers: { date: new Date(1_700_000_243_000).toUTCString() } },
    )));
    await expect(getLag()).resolves.toBe(243);
  });
});