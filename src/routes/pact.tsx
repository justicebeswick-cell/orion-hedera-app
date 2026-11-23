import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/aurion";
import { PactPanel } from "@/components/pact-panel";

export const Route = createFileRoute("/pact")({
  head: () => ({
    meta: [
      { title: "Pact — Oreon" },
      { name: "description", content: "Write a simple deal with someone, fingerprint it, and pay them in HBAR with the fingerprint attached." },
      { property: "og:title", content: "Pact — Oreon" },
      { property: "og:description", content: "Agree it on Hedera mainnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pact,
});

function Pact() { return <Shell title="Pact"><PactPanel /></Shell>; }
