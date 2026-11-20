import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAccount, hbarUsdLive } from "@/lib/hedera";
import { heldTokens, totalInHbar } from "@/lib/portfolio";
import { REFRESH_MS } from "@/lib/refresh";
import { savePortfolioObservation } from "@/lib/use-portfolio-history";

/** Records public observations while the wallet is open, regardless of chart visibility. */
export function PortfolioTracker({ accountId }: { accountId: string }) {
  const account = useQuery({ queryKey: ["acct", accountId], queryFn: () => getAccount(accountId), refetchInterval: REFRESH_MS });
  const tokens = useQuery({ queryKey: ["portfolio", accountId], queryFn: () => heldTokens(accountId), refetchInterval: REFRESH_MS });
  const rate = useQuery({ queryKey: ["hbar-usd"], queryFn: hbarUsdLive, refetchInterval: REFRESH_MS });
  useEffect(() => {
    if (!account.data || !tokens.data || !rate.data || account.isError || tokens.isError || rate.isError) return;
    const total = totalInHbar(account.data.tinybar / 1e8, tokens.data);
    if (total !== null) savePortfolioObservation(accountId, total * rate.data);
  }, [accountId, account.data, account.dataUpdatedAt, account.isError, tokens.data, tokens.dataUpdatedAt, tokens.isError, rate.data, rate.dataUpdatedAt, rate.isError]);
  return null;
}