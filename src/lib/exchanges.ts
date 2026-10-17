/** Keep provider identity and destination together; rate refreshes never reorder links. */
export const EXCHANGES = [
  { id: "coinbase", name: "Coinbase", url: "https://www.coinbase.com/price/hedera" },
  { id: "kraken", name: "Kraken", url: "https://www.kraken.com/prices/hedera" },
  { id: "cryptocom", name: "Crypto.com", url: "https://crypto.com/price/hedera-hashgraph" },
  { id: "binanceus", name: "Binance.US", url: "https://www.binance.us/buy-sell-crypto" },
  { id: "uphold", name: "Uphold", url: "https://uphold.com/prices/crypto/hedera-price" },
] as const;