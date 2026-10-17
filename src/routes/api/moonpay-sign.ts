import { createFileRoute } from "@tanstack/react-router";

/** Signs a MoonPay widget URL (required by MoonPay when a wallet address is prefilled).
 * Only signs buy.moonpay.com URLs for HBAR, so it can't be abused to sign anything else. */
export const Route = createFileRoute("/api/moonpay-sign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MOONPAY_SECRET_KEY"];
        if (!secret) return Response.json({ error: "not_configured" }, { status: 503 });
        const { url } = (await request.json().catch(() => ({}))) as { url?: string };
        let u: URL;
        try { u = new URL(String(url)); } catch { return Response.json({ error: "bad_url" }, { status: 400 }); }
        const addr = u.searchParams.get("walletAddress") ?? "";
        if (u.origin !== "https://buy.moonpay.com" || u.searchParams.get("currencyCode") !== "hbar" || !/^0\.0\.\d+$/.test(addr))
          return Response.json({ error: "bad_url" }, { status: 400 });
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(u.search));
        const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
        return Response.json({ signature });
      },
    },
  },
});
