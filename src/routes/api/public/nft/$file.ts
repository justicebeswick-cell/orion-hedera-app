import { createFileRoute } from "@tanstack/react-router";

// Public, read-only: serves NFT pictures and metadata uploaded from Oreon.
export const Route = createFileRoute("/api/public/nft/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[a-z0-9]{9}\.(png|jpg|webp|gif|json)$/.test(params.file)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("nft").download(params.file);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
