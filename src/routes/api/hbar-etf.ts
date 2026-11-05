import { createFileRoute } from "@tanstack/react-router";

/** HBAR held by the trust, from the issuer's own published holdings table. */
async function fetchHoldings() {
  const r = await fetch("https://canaryetfs.com/hbr/", {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
      accept: "text/html",
      "accept-language": "en-US",
    },
  });
  if (!r.ok) return null;
  const t = (await r.text()).replace(/<[^>]+>/g, "|").replace(/\s+/g, " ");
  const m = t.match(/\|(\d{2}\/\d{2}\/\d{4})\| \|HBR\| \|HEDERA\|([^]{0,400})/);
  if (!m) return null;
  // Row cells after the name: ticker, ticker, quantity, quantity, price, market value, weight, net assets, shares
  const cells = m[2].split("|").map((c) => c.trim()).filter(Boolean);
  const n = (s?: string) => Number((s ?? "").replace(/[,%]/g, ""));
  const hbar = n(cells[2]);
  if (!Number.isFinite(hbar) || hbar <= 0) return null;
  return { asOf: m[1], hbar, netAssets: n(cells[7]), shares: n(cells[8]) };
}

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
          const holdings = await fetchHoldings().catch(() => null);
          return Response.json(
            { name: res.meta.longName ?? "Canary HBAR ETF", symbol: "HBR", price: res.meta.regularMarketPrice, days, holdings },
            { headers: { "cache-control": "no-store" } },
          );
        } catch {
          return Response.json({ error: "ETF feed unreachable" }, { status: 502 });
        }
      },
    },
  },
});
