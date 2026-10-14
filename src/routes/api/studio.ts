import { createFileRoute } from "@tanstack/react-router";
import { handleStudio } from "@/lib/ai/studio.server";

export const Route = createFileRoute("/api/studio")({
  server: { handlers: { POST: ({ request }) => handleStudio(request) } },
});
