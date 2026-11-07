import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Coins } from "lucide-react";
import { MIRROR } from "@/lib/hedera";
import { fmtAmount } from "@/lib/display";
import { REFRESH_MS } from "@/lib/refresh";

export function HomeAssets({ accountId }: { accountId: string }) {
  const query = useQuery({
    queryKey: ["home-assets", accountId], refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const response = await fetch(`${MIRROR}/api/v1/accounts/${accountId}/tokens?limit=100`);
      if (!response.ok) throw new Error("Token balances unavailable.");
      const data = await response.json() as { tokens: { token_id: string; balance: number }[] };
      return Promise.all(data.tokens.filter((t) => t.balance > 0).map(async (token) => {
        const result = await fetch(`${MIRROR}/api/v1/tokens/${token.token_id}`);
        if (!result.ok) return { ...token, symbol: token.token_id, name: "HTS token", decimals: 0, known: false };
        const meta = await result.json();
        return { ...token, symbol: String(meta.symbol), name: String(meta.name), decimals: Number(meta.decimals), known: true };
      }));
    },
  });
  return <>
    {query.isPending && <div className="h-16 animate-pulse bg-muted/20" />}
    {query.isError && <p role="alert" className="py-4 text-sm text-destructive">Token balances unavailable.</p>}
    {query.data?.map((token) => <Link key={token.token_id} to="/vault" search={{ section: "holdings" }} className="home-asset">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Coins size={23} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{token.symbol}</span><span className="block truncate text-xs text-muted-foreground">{token.name}</span></span>
      <span className="text-right text-sm font-medium tnum">{token.known ? fmtAmount(token.balance / 10 ** token.decimals, { maximumFractionDigits: 8 }) : "—"}</span>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </Link>)}
  </>;
}