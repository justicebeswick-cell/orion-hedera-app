import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getNfts, getNftMetadata, nftUrl, preflightNft } from "@/lib/nfts";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
function mirror(overrides: { owner?: string; slots?: number; status?: number; associated?: boolean; receiverSignature?: boolean } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (overrides.status) return json({}, overrides.status);
    if (url.includes("/nfts/")) return json({ account_id: overrides.owner ?? "0.0.123" });
    if (url.includes("token.id=")) return json({ tokens: overrides.associated ? [{ token_id: "0.0.99" }] : [] });
    if (url.includes("/accounts/")) return json({ max_automatic_token_associations: overrides.slots ?? 1, used_automatic_token_associations: 0, receiver_sig_required: overrides.receiverSignature });
    return json({ type: "NON_FUNGIBLE_UNIQUE" });
  }));
}
it("allows an owned NFT to a recipient with an auto-association slot", async () => {
  mirror(); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).resolves.toBeUndefined();
});
it("rejects an NFT no longer owned by the sender", async () => {
  mirror({ owner: "0.0.789" }); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).rejects.toThrow("ownership");
});
it("requires an association when no automatic slots remain", async () => {
  mirror({ slots: 0 }); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).rejects.toThrow("association");
});
it("accepts an already associated recipient with zero free slots", async () => {
  mirror({ slots: 0, associated: true }); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).resolves.toBeUndefined();
});
it("fails closed when the mirror cannot verify the recipient", async () => {
  mirror({ status: 503 }); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).rejects.toThrow("verification unavailable");
});
it("blocks recipients from the device blocklist", async () => {
  localStorage.setItem("aurion.blocklist", JSON.stringify(["0.0.456"])); mirror();
  await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).rejects.toThrow("blocked"); expect(fetch).not.toHaveBeenCalled();
});
it("rejects recipients requiring a second signature", async () => {
  mirror({ receiverSignature: true }); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", 7)).rejects.toThrow("co-sign");
});
it("rejects unsafe serials before any mirror request", async () => {
  mirror(); await expect(preflightNft("0.0.123", "0.0.456", "0.0.99", Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow("invalid"); expect(fetch).not.toHaveBeenCalled();
});
it("rejects pagination outside the mainnet account path", async () => {
  await expect(getNfts("0.0.123", "https://evil.example/api/v1/accounts/0.0.123/nfts")).rejects.toThrow("invalid page");
});
it("allows HTTPS and IPFS images but rejects executable and private destinations", () => {
  expect(nftUrl("ipfs://bafyexample/image.png")).toBe("https://ipfs.io/ipfs/bafyexample/image.png");
  expect(nftUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
  for (const value of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://127.0.0.1/test", "https://user:pass@example.com", "https://device.local/test"]) expect(nftUrl(value)).toBeNull();
});
it("keeps NFT identity available when metadata is malformed", async () => {
  expect(await getNftMetadata({ token_id: "0.0.99", serial_number: 7, account_id: "0.0.123", metadata: "invalid" })).toEqual({ name: "0.0.99 #7", description: "", image: null });
});