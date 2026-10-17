export type ExchangeRate = { id: string; price: number | null; detail: string; at: number | null };
export type RateFeed = { rates: ExchangeRate[]; at: number };

export function positivePrice(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function read(url: string, pick: (j: any) => unknown): Promise<number | null> {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    return positivePrice(pick(await response.json()));
  } catch { return null; }
}

export async function fetchExchangeRates(): Promise<RateFeed> {
  const market = async (id: string, url: string, pick: (j: any) => unknown, label = "Market ask · excludes fees"): Promise<ExchangeRate> => {
    const price = await read(url, pick);
    return { id, price, detail: price === null ? "Feed unavailable" : label, at: price === null ? null : Date.now() };
  };
  const rates = await Promise.all([
    market("coinbase", "https://api.coinbase.com/v2/prices/HBAR-USD/buy", (j) => j.data.amount, "Buy price · excludes fees"),
    market("kraken", "https://api.kraken.com/0/public/Ticker?pair=HBARUSD", (j) => (Object.values(j.result)[0] as any).a[0]),
    market("cryptocom", "https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=HBAR_USD", (j) => j.result.data[0].k),
    market("binanceus", "https://api.binance.us/api/v3/ticker/bookTicker?symbol=HBARUSD", (j) => j.askPrice),
    market("uphold", "https://api.uphold.com/v0/ticker/HBAR-USD", (j) => j.ask),
  ]);
  return { rates, at: Date.now() };
}