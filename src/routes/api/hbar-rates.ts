import { createFileRoute } from "@tanstack/react-router";
import { fetchExchangeRates } from "@/lib/exchange-rates";

/** Public HBAR/USD buy prices (best ask) from exchanges. Read-only public market data. */
export const Route = createFileRoute("/api/hbar-rates")({
  server: {
    handlers: {
      GET: async () => {
        const feed = await fetchExchangeRates(process.env['MOONPAY_PUBLISHABLE_KEY'] ?? process.env['VITE_MOONPAY_API_KEY']);
        return Response.json(feed, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
