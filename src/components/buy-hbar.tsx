import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RateFeed } from "@/lib/exchange-rates";
import { Panel, Label } from "@/components/aurion";

/** Buy HBAR on an exchange, then send it to this wallet. Live prices from each exchange's public market data. */
const EXCHANGES = [
  { id: "coinbase", name: "Coinbase", url: "https://www.coinbase.com/price/hedera" },
  { id: "kraken", name: "Kraken", url: "https://www.kraken.com/prices/hedera" },
  { id: "gemini", name: "Gemini", url: "https://www.gemini.com" },
  { id: "cryptocom", name: "Crypto.com", url: "https://crypto.com/price/hedera-hashgraph" },
  { id: "binanceus", name: "Binance.US", url: "https://www.binance.us/buy-sell-crypto" },
  { id: "uphold", name: "Uphold", url: "https://uphold.com/en/prices/crypto/hedera-price" },
  { id: "moonpay", name: "MoonPay", url: "https://www.moonpay.com" },
] as const;

/** MoonPay publishable (pk_) key — safe in the browser. The secret key stays on the server for URL signing. */
const MOONPAY_KEY = (import.meta.env['VITE_MOONPAY_API_KEY'] as string | undefined) ?? "";

export function BuyHbar({ id }: { id: string }) {
  return <><BuyOnExchange id={id} />{MOONPAY_KEY && <BuyInApp id={id} />}</>;
}

function BuyInApp({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams({
      apiKey: MOONPAY_KEY, currencyCode: "hbar", walletAddress: id, baseCurrencyCode: "usd",
      paymentMethod: "google_pay", theme: "dark", colorCode: "#8b5cf6",
    });
    const url = `https://buy.moonpay.com?${q}`;
    fetch("/api/moonpay-sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) })
      .then((r) => r.json()).then((j) => j.signature ? setSrc(`${url}&signature=${encodeURIComponent(j.signature)}`) : setErr(true))
      .catch(() => setErr(true));
  }, [id]);
  if (err) return <p className="text-sm text-muted-foreground">MoonPay checkout is unavailable.</p>;
  return (
    <Panel>
      <Label>Buy HBAR</Label>
      <p className="mb-3 text-sm text-muted-foreground">Pay with Google Pay, Apple Pay or card through MoonPay. HBAR lands in {id}.</p>
      {src
        ? <iframe data-no-swipe title="Buy HBAR with MoonPay" src={src} allow="accelerometer; autoplay; camera; gyroscope; payment" className="h-[630px] w-full rounded-lg border border-border" />
        : <div className="h-[630px] w-full animate-pulse rounded-lg border border-border bg-card" />}
    </Panel>
  );
}

function BuyOnExchange({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const feed = useQuery<RateFeed>({
    queryKey: ["exchange-hbar-rates"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/hbar-rates", { cache: "no-store", signal });
      if (!response.ok) throw new Error("Exchange prices unavailable");
      const data = await response.json();
      if (!Array.isArray(data.rates) || typeof data.at !== "number") throw new Error("Exchange prices unavailable");
      return data;
    },
    refetchInterval: 30000,
    retry: false,
  });
  const priced = EXCHANGES.map((e) => {
    const rate = feed.data?.rates.find((r) => r.id === e.id);
    return { ...e, price: rate?.price ?? null, detail: rate?.detail ?? "Loading…" };
  });
  const best = Math.min(...priced.filter((p) => p.id !== "moonpay").map((p) => p.price ?? Infinity));
  const sorted = [...priced].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  };

  return (
    <Panel>
      <Label>Buy HBAR</Label>
      <p className="mb-4 text-sm text-muted-foreground">Compare HBAR prices. Buying and sending through connected exchange accounts is not available yet.</p>

      <Button variant="outline" data-no-swipe onClick={copy} className="mb-4 flex h-auto w-full items-center justify-between px-3 py-3 text-left">
        <span className="font-mono text-sm">{id}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary"><Copy />{copied ? "Copied" : "Copy"}</span>
      </Button>

      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-w-0"><p>Price per HBAR (USD)</p><p aria-live="polite" className="mt-1">{feed.isError ? "Refresh failed · try again" : feed.isFetching ? "Refreshing…" : feed.data ? `Updated ${new Date(feed.data.at).toLocaleTimeString()} · every 30s` : "Loading…"}</p></div>
        <Button data-no-swipe variant="outline" size="icon" aria-label="Refresh live rates" title="Refresh live rates" disabled={feed.isFetching} onClick={() => void feed.refetch()}><RefreshCw className={feed.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sorted.map((e) => (
          <li key={e.id}>
            <div className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {e.name}
                  {e.id !== "moonpay" && e.price !== null && e.price === best && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Lowest listed</span>}
                </div>
                <div className="text-xs text-muted-foreground">{feed.isError ? "Previous rate · refresh failed" : e.detail}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm">{e.price !== null ? `$${e.price.toFixed(5)}` : "—"}</div>
                <Button asChild variant="link" size="sm" className="h-6 px-0 text-xs"><a data-no-swipe href={e.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${e.name}`}>Visit <ExternalLink /></a></Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Market prices are not final purchase quotes. Payment fees, spreads and withdrawal fees can change the total. MoonPay quotes, when available, are shown separately with quoted fees. Payment methods depend on your country and provider.</p>
    </Panel>
  );
}
