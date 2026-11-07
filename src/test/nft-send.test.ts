import { beforeEach, expect, it, vi } from "vitest";
import { sendNft } from "@/lib/signer";
const state = vi.hoisted(() => ({ wallet: false, status: "SUCCESS", calls: [] as unknown[][], closed: false }));
vi.mock("@/lib/keystore", () => ({ readKeystoreMeta: () => ({ accountId: "0.0.123", kind: "ed25519" }), unlockKeystore: async () => "private" }));
vi.mock("@/lib/walletconnect", () => ({ connectedWallet: () => state.wallet ? { id: "0.0.123", wallet: "HashPack" } : null, getWcSigner: async () => ({}) }));
vi.mock("@/lib/nfts", () => ({ preflightNft: vi.fn(async () => {}) }));
vi.mock("@hashgraph/sdk", () => {
  class TransferTransaction {
    addNftTransfer(...args: unknown[]) { state.calls.push(args); return this; }
    setMaxTransactionFee() { return this; }
    async execute() { return { transactionId: { toString: () => "0.0.123@1.2" }, getReceipt: async () => ({ status: { toString: () => state.status } }) }; }
  }
  return { TransferTransaction, Hbar: class {}, PrivateKey: { fromStringED25519: () => ({}) }, Client: { forMainnet: () => ({ setOperator() { return this; }, close() { state.closed = true; } }) } };
});
vi.mock("@hiero-ledger/sdk", () => {
  class TransferTransaction {
    addNftTransfer(...args: unknown[]) { state.calls.push(args); return this; }
    setMaxTransactionFee() { return this; }
    async freezeWithSigner() { return this; }
    async executeWithSigner() { return { transactionId: { toString: () => "0.0.123@1.2" }, getReceiptWithSigner: async () => ({ status: { toString: () => state.status } }) }; }
  }
  return { TransferTransaction, Hbar: class {} };
});
beforeEach(() => { state.wallet = false; state.status = "SUCCESS"; state.calls = []; state.closed = false; });
it("sends exactly one selected NFT serial using device signing", async () => {
  expect(await sendNft("0.0.123", "0.0.456", "0.0.99", 7, "code")).toBe("0.0.123@1.2");
  expect(state.calls).toEqual([["0.0.99", 7, "0.0.123", "0.0.456"]]); expect(state.closed).toBe(true);
});
it("does not report a failed device receipt as sent", async () => {
  state.status = "INVALID_SIGNATURE";
  await expect(sendNft("0.0.123", "0.0.456", "0.0.99", 7, "code")).rejects.toThrow("signature rejected"); expect(state.closed).toBe(true);
});
it("does not report a failed WalletConnect receipt as sent", async () => {
  state.wallet = true; state.status = "INVALID_SIGNATURE";
  await expect(sendNft("0.0.123", "0.0.456", "0.0.99", 7, "")).rejects.toThrow("signature rejected");
});
it("confirms a WalletConnect NFT transfer after a successful receipt", async () => {
  state.wallet = true;
  expect(await sendNft("0.0.123", "0.0.456", "0.0.99", 7, "")).toBe("0.0.123@1.2");
  expect(state.calls).toEqual([["0.0.99", 7, "0.0.123", "0.0.456"]]);
});