import { createFileRoute } from "@tanstack/react-router";

/** Public daily market data for the Canary HBAR ETF (Nasdaq: HBR). Read-only. */
export const Route = createFileRoute("/api/hbar-etf")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/HBR?range=2y&interval=1d", {
            headers: { "user-agent": "Mozilla/5.0" },
          });
          if (!r.ok) throw new Error(String(r.status));
          const j = await r.json();
          const res = j.chart.result[0];
          const q = res.indicators.quote[0];
          const days = (res.timestamp as number[])
            .map((t, i) => ({ t: t * 1000, c: q.close[i], v: q.volume[i] }))
            .filter((d) => d.c != null && d.v != null);
          return Response.json(
            { name: res.meta.longName ?? "Canary HBAR ETF", symbol: "HBR", price: res.meta.regularMarketPrice, days },
            { headers: { "cache-control": "no-store" } },
          );
        } catch {
          return Response.json({ error: "ETF feed unreachable" }, { status: 502 });
        }
      },
    },
  },
});
