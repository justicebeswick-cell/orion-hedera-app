import { createFileRoute } from "@tanstack/react-router";
import { Shell, Panel, Label } from "@/components/aurion";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Orion" },
      { name: "description", content: "Orion is a mainnet HBAR vault. The network is the notary. You hold the keys." },
      { property: "og:title", content: "About — Orion" },
      { property: "og:description", content: "A mainnet HBAR vault. Limits and screening run before value moves." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <Shell title="About">
      <Panel>
        <p className="text-lg leading-relaxed">
          Orion is a mainnet HBAR vault. Limits and screening run before value moves. Staking, pacts, and one heir transfer
          sit on the same account. The network is the notary. You hold the keys.
        </p>
      </Panel>
      <Panel className="mt-4">
        <Label>Custody</Label>
        <p className="text-sm text-muted-foreground">
          Orion does not custody keys. Keys are created on your device. Support cannot move HBAR or restore a phrase.
        </p>
      </Panel>
    </Shell>
  );
}
