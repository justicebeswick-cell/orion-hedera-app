import { createFileRoute } from "@tanstack/react-router";
import { ACCOUNT_ID_RE, fetchWalletChainHistory } from "@/lib/portfolio-history.server";

/** Public read-only all-time portfolio history reconstructed from Hedera Mirror Node + HBAR market candles. */
export const Route = createFileRoute("/api/portfolio-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const account = (url.searchParams.get("account") ?? "").trim();
        if (!ACCOUNT_ID_RE.test(account)) {
          return Response.json({ error: "Invalid Hedera account ID" }, { status: 400 });
        }
        const history = await fetchWalletChainHistory(account);
        if (!history) {
          return Response.json({ error: "Account not found or history unavailable" }, { status: 404 });
        }
        return Response.json(history, {
          headers: { "cache-control": "public, max-age=300" },
        });
      },
    },
  },
});