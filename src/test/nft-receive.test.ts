import { afterEach, expect, it, vi } from "vitest";
import { checkNftAssociation, getNftReceiveState } from "@/lib/nft-receive";

afterEach(() => vi.unstubAllGlobals());
function mirror({ maximum = 0, used = 0, associated = false, type = "NON_FUNGIBLE_UNIQUE", kyc = "GRANTED", status = 200 } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.includes("token.id=") ? { tokens: associated ? [{ token_id: "0.0.99", kyc_status: kyc }] : [] } : url.includes("/tokens/") ? { type } : { account: "0.0.123", max_automatic_token_associations: maximum, used_automatic_token_associations: used }
  ), { status })));
}
it("identifies zero-slot accounts as needing NFT collection association", async () => {
  mirror(); expect(await getNftReceiveState("0.0.123", "0.0.99")).toMatchObject({ associated: false, freeSlots: 0, unlimited: false });
});
it("recognizes unlimited NFT auto-association on mainnet", async () => {
  mirror({ maximum: -1 }); expect(await getNftReceiveState("0.0.123")).toMatchObject({ unlimited: true });
});
it("subtracts used slots from the receiving allowance", async () => {
  mirror({ maximum: 10, used: 7 }); expect((await getNftReceiveState("0.0.123")).freeSlots).toBe(3);
});
it("requires a numbered account rather than an EVM alias", async () => {
  mirror(); await expect(getNftReceiveState("0x1234567890123456789012345678901234567890")).rejects.toThrow("mainnet account"); expect(fetch).not.toHaveBeenCalled();
});
it("rejects a fungible token in NFT collection association", async () => {
  mirror({ type: "FUNGIBLE_COMMON" }); await expect(checkNftAssociation("0.0.123", "0.0.99")).rejects.toThrow("NFT collection ID");
});
it("does not charge for a duplicate association", async () => {
  mirror({ associated: true }); await expect(checkNftAssociation("0.0.123", "0.0.99")).rejects.toThrow("already associated");
});
it("does not report a KYC-blocked association as ready", async () => {
  mirror({ associated: true, kyc: "REVOKED" }); await expect(getNftReceiveState("0.0.123", "0.0.99")).rejects.toThrow("grant your account KYC");
});
it("fails closed when receiving settings cannot be read", async () => {
  mirror({ status: 503 }); await expect(checkNftAssociation("0.0.123", "0.0.99")).rejects.toThrow("unavailable");
});