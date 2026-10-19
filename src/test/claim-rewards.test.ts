import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  mode: vi.fn(), key: vi.fn(), account: vi.fn(), payer: vi.fn(), fee: vi.fn(), memo: vi.fn(), close: vi.fn(),
  execute: vi.fn(), operator: vi.fn(), audit: vi.fn(), signer: vi.fn(), walletExecute: vi.fn(), freeze: vi.fn(),
}));
vi.mock("@/lib/signer", () => ({ signMode: mock.mode, deviceKey: mock.key }));
vi.mock("@/lib/guard", () => ({ audit: mock.audit }));
vi.mock("@/lib/walletconnect", () => ({ getWcSigner: mock.signer }));
vi.mock("@hashgraph/sdk", () => ({
  AccountUpdateTransaction: class {
    setAccountId(v: string) { mock.account(v); return this; }
    setTransactionId(v: string) { mock.payer(v); return this; }
    setTransactionMemo(v: string) { mock.memo(v); return this; }
    setMaxTransactionFee(v: unknown) { mock.fee(v); return this; }
    execute = mock.execute;
  },
  Hbar: class { constructor(public amount: number) {} },
  TransactionId: { generate: (id: string) => id },
  Client: { forMainnet: () => ({ setOperator: (...args: unknown[]) => { mock.operator(...args); return { close: mock.close }; } }) },
}));
vi.mock("@hiero-ledger/sdk", () => ({
  AccountUpdateTransaction: class {
    setAccountId(v: string) { mock.account(v); return this; }
    setTransactionId(v: string) { mock.payer(v); return this; }
    setTransactionMemo(v: string) { mock.memo(v); return this; }
    setMaxTransactionFee(v: unknown) { mock.fee(v); return this; }
    freezeWithSigner(v: unknown) { mock.freeze(v); return this; }
    executeWithSigner = mock.walletExecute;
  },
  Hbar: class { constructor(public amount: number) {} },
  TransactionId: { generate: (id: string) => id },
}));
import { claimStakingRewards } from "@/lib/staking";

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
const status = (value: string) => ({ status: { toString: () => value } });
function network(pending = 12345678) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ pending_reward: pending, staked_node_id: 0, decline_reward: false, balance: { balance: 1000000000 } }) })
    .mockResolvedValue({ ok: true, json: async () => ({ transactions: [{ consensus_timestamp: "123.0", result: "SUCCESS", staking_reward_transfers: [{ account: "0.0.123", amount: 12345678 }] }] }) }));
}

describe("Reward claim signing", () => {
  it("signs a self-paid mainnet update without changing account properties and reports the actual payout", async () => {
    network(); mock.mode.mockReturnValue({ kind: "device" }); mock.key.mockResolvedValue("unlocked-key");
    mock.execute.mockResolvedValue({ transactionId: "0.0.123@1.0", getReceipt: async () => status("SUCCESS") });
    const result = await claimStakingRewards("0.0.123", "device-passphrase");
    expect(mock.key).toHaveBeenCalledWith("0.0.123", "device-passphrase");
    expect(mock.operator).toHaveBeenCalledWith("0.0.123", "unlocked-key");
    expect(mock.payer).toHaveBeenCalledWith("0.0.123");
    expect(mock.fee.mock.calls[0][0].amount).toBe(2);
    expect(result.paidTinybar).toBe(12345678);
    expect(mock.close).toHaveBeenCalledOnce();
  });
  it("requires a successful connected-wallet receipt rather than claiming success after submission", async () => {
    network(); mock.mode.mockReturnValue({ kind: "wallet", name: "HashPack" }); mock.signer.mockResolvedValue({});
    mock.walletExecute.mockResolvedValue({ transactionId: "0.0.123@1.0", getReceiptWithSigner: async () => status("INVALID_SIGNATURE") });
    await expect(claimStakingRewards("0.0.123", "")).rejects.toThrow("INVALID_SIGNATURE");
    expect(mock.key).not.toHaveBeenCalled();
    expect(mock.audit).not.toHaveBeenCalled();
  });
  it("does not submit a fee-bearing transaction when fresh pending rewards are zero", async () => {
    network(0);
    await expect(claimStakingRewards("0.0.123", "")).rejects.toThrow("no pending rewards");
    expect(mock.execute).not.toHaveBeenCalled();
    expect(mock.walletExecute).not.toHaveBeenCalled();
  });
});