/** Mirror-node rewards are integer tinybars, not an { amount } object. */
export function canClaimReward(pendingReward: number | null | undefined): boolean {
  return typeof pendingReward === "number" && Number.isSafeInteger(pendingReward) && pendingReward > 0;
}

export function paidRewardForAccount(
  transfers: { account: string; amount: number }[] | undefined,
  accountId: string,
): number {
  return transfers?.filter((t) => t.account === accountId).reduce((sum, t) => sum + t.amount, 0) ?? 0;
}