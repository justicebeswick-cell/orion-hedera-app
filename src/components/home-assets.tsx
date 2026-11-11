import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MIRROR } from "@/lib/hedera";
import { fmtAmount } from "@/lib/display";
import { REFRESH_MS } from "@/lib/refresh";
import { listTokens } from "@/lib/swap";

function AssetLogo({ symbol, icon }: { symbol: string; icon?: string | undefined }) {
  const [failed, setFailed] = useState(false);
  const safeIcon = icon?.startsWith("https://") ? icon : undefined;
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground">
    {safeIcon && !failed
      ? <img src={safeIcon} alt={`${symbol} logo`} width={44} height={44} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-contain" />
      : <span className="text-sm font-semibold" aria-label={`${symbol} logo unavailable`}>{symbol.slice(0, 2).toUpperCase()}</span>}
  </span>;
}

export function HomeAssets({ accountId }: { accountId: string }) {
  // Share the existing market catalog with Vault; a catalog outage never hides balances.
  const artwork = useQuery({ queryKey: ["swap-tokens"], queryFn: listTokens, staleTime: 10 * 60_000 });
  const icons = new Map(artwork.data?.map((token) => [token.id, token.icon]));
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
        return { ...token, symbol: String(meta.symbol), name: String(meta.name), decimals: Number(meta.decimals), known: true, nft: meta.type === "NON_FUNGIBLE_UNIQUE" };
      }));
    },
  });
  return <>
    {query.isPending && <div className="h-16 animate-pulse bg-muted/20" />}
    {query.isError && <p role="alert" className="py-4 text-sm text-destructive">Token balances unavailable.</p>}
    {query.data?.length === 0 && <Link to="/vault" search={{ section: "swap" }} className="home-asset text-sm text-muted-foreground">
      <span className="flex-1">No custom tokens yet. <span className="text-primary">Explore HTS assets</span></span>
      <ChevronRight size={14} className="shrink-0" />
    </Link>}
    {query.data?.map((token) => <Link key={token.token_id} to="/vault" search={{ section: "nft" in token && token.nft ? "nfts" : "holdings" }} className="home-asset">
      <AssetLogo key={icons.get(token.token_id) ?? token.token_id} symbol={token.symbol} icon={icons.get(token.token_id)} />
      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{token.symbol}</span><span className="block truncate text-xs text-muted-foreground">{token.name}</span></span>
      <span className="min-w-0 max-w-[50%] break-words text-right text-sm font-medium tnum">{token.known ? fmtAmount(token.balance / 10 ** token.decimals, { maximumFractionDigits: 8 }) : "—"}</span>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </Link>)}
  </>;
}