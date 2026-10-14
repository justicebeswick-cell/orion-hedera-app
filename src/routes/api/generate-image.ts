import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings } from "@/lib/ai/image-gateway.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: unknown; stream?: unknown };
        try { body = await request.json(); } catch { return new Response("Invalid request", { status: 400 }); }
        const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
        if (!prompt) return new Response("Describe the image first", { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        try {
          const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, body.stream !== false, request.signal);
          return new Response(upstream.body, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          if (request.signal.aborted || (e as Error).name === "AbortError") return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
