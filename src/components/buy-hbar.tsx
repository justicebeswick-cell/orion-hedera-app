import { useEffect, useState } from "react";
import { Panel, Label } from "@/components/aurion";

/** Buy HBAR on an exchange, then send it to this wallet. Live prices from each exchange's public market data. */
const EXCHANGES = [
  { id: "coinbase", name: "Coinbase", fee: "Card ~3.99%", url: "https://www.coinbase.com/price/hedera" },
  { id: "kraken", name: "Kraken", fee: "Card ~3.75%", url: "https://www.kraken.com/prices/hedera" },
  { id: "gemini", name: "Gemini", fee: "Card ~3.49%", url: "https://www.gemini.com/prices/hedera" },
  { id: "cryptocom", name: "Crypto.com", fee: "Card ~2.99%", url: "https://crypto.com/price/hedera-hashgraph" },
  { id: "binanceus", name: "Binance.US", fee: "Card ~3.75%", url: "https://www.binance.us/buy-sell-crypto" },
  { id: "moonpay", name: "MoonPay", fee: "Price at checkout", url: "https://www.moonpay.com/buy/hbar" },
] as const;

type Rates = Record<string, number | null>;

/** MoonPay publishable (pk_) key — safe in the browser. The secret key stays on the server for URL signing. */
const MOONPAY_KEY = (import.meta.env['VITE_MOONPAY_API_KEY'] as string | undefined) ?? "";

export function BuyHbar({ id }: { id: string }) {
  if (MOONPAY_KEY) return <BuyInApp id={id} />;
  return <BuyOnExchange id={id} />;
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
  if (err) return <BuyOnExchange id={id} />;
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
  const [rates, setRates] = useState<Rates | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/hbar-rates").then((r) => r.json()).then((j) => {
      if (!alive) return;
      setRates(Object.fromEntries(j.rates.map((r: { id: string; price: number | null }) => [r.id, r.price])));
      setFailed(false);
    }).catch(() => alive && setFailed(true));
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const priced = EXCHANGES.map((e) => ({ ...e, price: rates?.[e.id] ?? null }));
  const best = Math.min(...priced.map((p) => p.price ?? Infinity));
  const sorted = [...priced].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const copy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel>
      <Label>Buy HBAR</Label>
      <ol className="mb-4 space-y-1 text-sm text-muted-foreground">
        <li>1. Copy your address.</li>
        <li>2. Pick an exchange. Pay with Google Pay or card.</li>
        <li>3. Send the HBAR to your address. It lands here.</li>
      </ol>

      <button data-no-swipe onClick={copy} className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-3 text-left">
        <span className="font-mono text-sm">{id}</span>
        <span className="text-xs font-medium text-primary">{copied ? "Copied" : "Copy"}</span>
      </button>

      <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Price per HBAR (USD)</span>
        <span>{failed ? "Prices unavailable" : rates ? "Live · updates every 30s" : "Loading…"}</span>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sorted.map((e) => (
          <li key={e.id}>
            <a data-no-swipe href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {e.name}
                  {e.price !== null && e.price === best && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Best price</span>}
                </div>
                <div className="text-xs text-muted-foreground">Google Pay · {e.fee}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">{e.price !== null ? `$${e.price.toFixed(5)}` : "—"}</div>
                <div className="text-xs text-primary">Buy →</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Prices are each exchange's live market price. Card and Google Pay fees are typical and set by the exchange. Google Pay availability depends on your country.</p>
    </Panel>
  );
}
