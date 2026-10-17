import { createFileRoute } from "@tanstack/react-router";

type Rate = { id: string; price: number | null };

async function get(url: string, pick: (j: any) => unknown): Promise<number | null> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const n = Number(pick(await r.json()));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
}

/** Public HBAR/USD buy prices (best ask) from exchanges. Read-only public market data. */
export const Route = createFileRoute("/api/hbar-rates")({
  server: {
    handlers: {
      GET: async () => {
        const rates: Rate[] = await Promise.all([
          get("https://api.coinbase.com/v2/prices/HBAR-USD/buy", (j) => j.data.amount).then((price) => ({ id: "coinbase", price })),
          get("https://api.kraken.com/0/public/Ticker?pair=HBARUSD", (j) => (Object.values(j.result)[0] as any).a[0]).then((price) => ({ id: "kraken", price })),
          get("https://api.gemini.com/v1/pubticker/hbarusd", (j) => j.ask).then((price) => ({ id: "gemini", price })),
          get("https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=HBAR_USD", (j) => j.result.data[0].k).then((price) => ({ id: "cryptocom", price })),
          get("https://api.binance.us/api/v3/ticker/bookTicker?symbol=HBARUSD", (j) => j.askPrice).then((price) => ({ id: "binanceus", price })),
        ]);
        return Response.json({ rates, at: Date.now() }, { headers: { "cache-control": "public, max-age=30" } });
      },
    },
  },
});
