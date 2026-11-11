import { beforeEach, expect, it, vi } from "vitest";
import { associateNftCollection } from "@/lib/signer";

const state = vi.hoisted(() => ({ wallet: false, status: "SUCCESS", calls: [] as unknown[][], closed: false }));
vi.mock("@/lib/keystore", () => ({ readKeystoreMeta: () => ({ accountId: "0.0.123", kind: "ed25519" }), unlockKeystore: async () => "private" }));
vi.mock("@/lib/walletconnect", () => ({ connectedWallet: () => state.wallet ? { id: "0.0.123", wallet: "HashPack" } : null, getWcSigner: async () => ({}) }));
vi.mock("@/lib/nft-receive", () => ({ checkNftAssociation: vi.fn(async () => ({})) }));
function sdkMock(kind: string) {
  class TokenAssociateTransaction {
    setAccountId(id: string) { state.calls.push([kind, "account", id]); return this; }
    setTokenIds(ids: string[]) { state.calls.push([kind, "collections", ids]); return this; }
    setMaxTransactionFee(fee: { value: number }) { state.calls.push([kind, "fee", fee.value]); return this; }
    async freezeWithSigner() { return this; }
    async executeWithSigner() { return { transactionId: { toString: () => "0.0.123@1.2" }, getReceiptWithSigner: async () => ({ status: { toString: () => state.status } }) }; }
    async execute() { return { transactionId: { toString: () => "0.0.123@1.2" }, getReceipt: async () => ({ status: { toString: () => state.status } }) }; }
  }
  return { TokenAssociateTransaction, Hbar: class { constructor(public value: number) {} }, PrivateKey: { fromStringED25519: () => ({}) }, Client: { forMainnet: () => ({ setOperator() { return this; }, close() { state.closed = true; } }) } };
}
vi.mock("@hashgraph/sdk", () => sdkMock("device"));
vi.mock("@hiero-ledger/sdk", () => sdkMock("wallet"));
beforeEach(() => { state.wallet = false; state.status = "SUCCESS"; state.calls = []; state.closed = false; });
it("associates the selected NFT collection with a 2 HBAR fee cap using the device key", async () => {
  expect(await associateNftCollection("0.0.123", "0.0.99", "code")).toBe("0.0.123@1.2");
  expect(state.calls).toEqual([["device", "account", "0.0.123"], ["device", "collections", ["0.0.99"]], ["device", "fee", 2]]); expect(state.closed).toBe(true);
});
it("uses the WalletConnect SDK for a connected HashPack association", async () => {
  state.wallet = true; await associateNftCollection("0.0.123", "0.0.99", "");
  expect(state.calls).toEqual([["wallet", "account", "0.0.123"], ["wallet", "collections", ["0.0.99"]], ["wallet", "fee", 2]]);
});
it.each([false, true])("does not report association success for a failed receipt (wallet=%s)", async (wallet) => {
  state.wallet = wallet; state.status = "INVALID_SIGNATURE";
  await expect(associateNftCollection("0.0.123", "0.0.99", "code")).rejects.toThrow("signature rejected");
});