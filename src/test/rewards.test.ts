import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccount, hbar } from "@/lib/hedera";
import { canClaimReward, paidRewardForAccount } from "@/lib/rewards";

afterEach(() => vi.unstubAllGlobals());

describe("Home staking rewards", () => {
  it("reads the numeric pending reward and displays all eight HBAR decimal places", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      account: "0.0.123", balance: { balance: 1000000000, timestamp: "123.0" }, pending_reward: 12345678,
    }) }));
    const account = await getAccount("0.0.123");
    expect(account.pendingReward).toBe(12345678);
    expect(hbar(account.pendingReward)).toBe("0.12345678");
  });

  it("treats missing rewards as zero rather than inventing an amount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      account: "0.0.123", balance: { balance: 1000000000, timestamp: "123.0" }, pending_reward: null,
    }) }));
    expect((await getAccount("0.0.123")).pendingReward).toBe(0);
  });

  it("permits a claim for one tinybar but not zero, unknown or invalid rewards", () => {
    expect(canClaimReward(1)).toBe(true);
    expect(canClaimReward(0)).toBe(false);
    expect(canClaimReward(undefined)).toBe(false);
    expect(canClaimReward(-1)).toBe(false);
    expect(canClaimReward(NaN)).toBe(false);
  });

  it("reports only staking rewards paid to the claiming account, not net balance changes", () => {
    expect(paidRewardForAccount([{ account: "0.0.123", amount: 12345678 }, { account: "0.0.456", amount: 900 }], "0.0.123")).toBe(12345678);
    expect(paidRewardForAccount([], "0.0.123")).toBe(0);
  });
});