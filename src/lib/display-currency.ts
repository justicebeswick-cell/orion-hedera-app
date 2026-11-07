let rates: Record<string, number> = { USD: 1 };
export function setCurrencyRates(next: Record<string, number>) { rates = { USD: 1, ...next }; }
export function convertUsd(value: number, currency: string): number | null {
  const rate = rates[currency];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? value * rate : null;
}