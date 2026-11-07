import type { Tx } from "@/lib/hedera";
import type { Preferences } from "@/lib/preferences";

export function showTransaction(tx: Tx, account: string, prefs: Preferences, blocked: string[], feeIds: string[]): boolean {
  if (prefs.hideFees && feeIds.includes(tx.transaction_id)) return false;
  if (!prefs.hideSpam) return true;
  const incoming = (tx.transfers ?? []).some((transfer) => transfer.account === account && transfer.amount > 0);
  return !(incoming && (tx.transfers ?? []).some((transfer) => transfer.amount < 0 && blocked.includes(transfer.account)));
}