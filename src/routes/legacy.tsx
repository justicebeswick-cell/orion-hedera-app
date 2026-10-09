import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Panel, Label, IdentityGate } from "@/components/aurion";
import { ACCOUNT_RE } from "@/lib/hedera";

export const Route = createFileRoute("/legacy")({
  head: () => ({
    meta: [
      { title: "Legacy — AURION" },
      { name: "description", content: "One heir. One HBAR amount. One 30-day switch on Hedera mainnet." },
      { property: "og:title", content: "Legacy — AURION" },
      { property: "og:description", content: "Leave it. A rolling 30-day scheduled transfer to one heir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legacy,
});

function Legacy() {
  const [heir, setHeir] = useState("");
  const [amount, setAmount] = useState("");
  const [confirm, setConfirm] = useState("");
  const ready = ACCOUNT_RE.test(heir.trim()) && Number(amount) > 0 && confirm === "30";
  return (
    <Shell title="Legacy">
      <p className="mb-4 text-sm text-muted-foreground">Switch not armed.</p>
      <Panel>
        <Label>Heir account</Label>
        <input className="field font-mono tnum" placeholder="0.0.…" value={heir} onChange={(e) => setHeir(e.target.value)} />
        <Label><span className="mt-4 block">Exact amount ℏ</span></Label>
        <input className="field tnum" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Label><span className="mt-4 block">Window — type 30</span></Label>
        <input className="field tnum" inputMode="numeric" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <p className="mt-4 text-xs text-muted-foreground">
          If you do not check in within 30 days, {amount || "the amount"} ℏ moves to {heir || "the heir"}. Without AURION running.
        </p>
        {ready && <p className="mt-2 text-xs text-success">Terms complete.</p>}
      </Panel>
      <Panel className="mt-4">
        <Label>Arm switch on mainnet</Label>
        <IdentityGate action="Arming" />
      </Panel>
    </Shell>
  );
}
