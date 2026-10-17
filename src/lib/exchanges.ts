/** Keep provider identity and destination together; rate refreshes never reorder links. */
export const EXCHANGES = [
  { id: "coinbase", name: "Coinbase", url: "https://www.coinbase.com/price/hedera" },
  { id: "kraken", name: "Kraken", url: "https://www.kraken.com/prices/hedera" },
  { id: "cryptocom", name: "Crypto.com", url: "https://crypto.com/price/hedera" },
  { id: "binanceus", name: "Binance.US", url: "https://www.binance.us/buy-sell-crypto?crypto=HBAR" },
  { id: "uphold", name: "Uphold", url: "https://uphold.com/en-us/assets/crypto/buy-hbar" },
] as const;