import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Panel, Label, IdentityGate } from "@/components/aurion";
import { sha256Hex, ACCOUNT_RE } from "@/lib/hedera";

export const Route = createFileRoute("/pact")({
  head: () => ({
    meta: [
      { title: "Pact — AURION" },
      { name: "description", content: "Two Hedera accounts accept the same text. Pay with one signed HBAR transfer." },
      { property: "og:title", content: "Pact — AURION" },
      { property: "og:description", content: "Agree it on Hedera mainnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pact,
});

function Pact() {
  const [f, setF] = useState({ counterparty: "", scope: "", amount: "", deliverable: "", revisions: "" });
  const [hash, setHash] = useState("");
  const md = [
    "# AURION Pact v1",
    `Counterparty: ${f.counterparty.trim()}`,
    `Amount: ${f.amount.trim()} HBAR`,
    `Deliverable: ${f.deliverable.trim()}`,
    `Revisions: ${f.revisions.trim()}`,
    "",
    "## Scope",
    f.scope.trim(),
  ].join("\n").trim() + "\n";
  useEffect(() => { sha256Hex(md).then(setHash); }, [md]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Shell title="Pact">
      <Panel>
        <Label>Draft</Label>
        <div className="space-y-3">
          <input className="field font-mono tnum" placeholder="Counterparty 0.0.…" value={f.counterparty} onChange={set("counterparty")} />
          {f.counterparty && !ACCOUNT_RE.test(f.counterparty.trim()) && <p className="text-xs text-destructive">Not a Hedera account id.</p>}
          <textarea className="field h-28 text-sm" placeholder="Scope — one paragraph" value={f.scope} onChange={set("scope")} />
          <div className="grid grid-cols-2 gap-3">
            <input className="field tnum" inputMode="decimal" placeholder="Amount ℏ" value={f.amount} onChange={set("amount")} />
            <input className="field tnum" inputMode="numeric" placeholder="Revisions" value={f.revisions} onChange={set("revisions")} />
          </div>
          <input className="field" placeholder="Deliverable — one line" value={f.deliverable} onChange={set("deliverable")} />
        </div>
      </Panel>
      <Panel className="mt-4">
        <Label>Canonical text</Label>
        <pre className="whitespace-pre-wrap rounded-md bg-graphite p-3 font-mono text-xs text-muted-foreground">{md}</pre>
        <p className="mt-3 break-all font-mono text-xs text-signal">sha256 {hash}</p>
      </Panel>
      <Panel className="mt-4">
        <Label>Propose on mainnet</Label>
        <IdentityGate action="Propose" />
      </Panel>
    </Shell>
  );
}
