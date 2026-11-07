import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Label, SignButton } from "@/components/aurion";
import { sha256Hex, ACCOUNT_RE, HASHSCAN } from "@/lib/hedera";
import { useAccount } from "@/lib/account";
import { sendHbar } from "@/lib/signer";
import { audit, checkSend } from "@/lib/guard";
import { HbarLogo } from "@/components/hbar";

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs text-signal tnum">{n}</span>
    <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{children}</p></div>
  </div>
);

export function PactPanel() {
  const { id } = useAccount();
  const [f, setF] = useState({ counterparty: "", scope: "", amount: "", deliverable: "", revisions: "" });
  const [hash, setHash] = useState("");
  const md = [
    "# Orion Pact v1",
    `Payer: ${id ?? ""}`,
    `Paid to: ${f.counterparty.trim()}`,
    `Price: ${f.amount.trim()} HBAR`,
    `What gets handed over: ${f.deliverable.trim()}`,
    `Free rounds of changes: ${f.revisions.trim()}`,
    "",
    "## The work",
    f.scope.trim(),
  ].join("\n").trim() + "\n";
  useEffect(() => { sha256Hex(md).then(setHash); }, [md]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const amount = Number(f.amount);
  const ready = !!id && ACCOUNT_RE.test(f.counterparty.trim()) && amount > 0 && f.scope.trim() && f.deliverable.trim();

  return (
    <div>
      <Panel>
        <Label>How a pact works</Label>
        <div className="space-y-3">
          <Step n={1} title="Write the deal">Who you're paying, for what, and how much. Plain words.</Step>
          <Step n={2} title="Share the text">Send the deal text to the other person. They check it says what you agreed.</Step>
          <Step n={3} title="Pay with proof">You pay in HBAR. A fingerprint of the deal rides along with the payment, forever on Hedera. If anyone edits the text later, the fingerprint stops matching.</Step>
        </div>
      </Panel>

      <Panel className="mt-4">
        <Label>Write the deal</Label>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm">Who are you paying?</p>
            <input className="field font-mono tnum" placeholder="Their Hedera account, like 0.0.12345" value={f.counterparty} onChange={set("counterparty")} />
            {f.counterparty && !ACCOUNT_RE.test(f.counterparty.trim()) && <p className="mt-1 text-xs text-destructive">That isn't a Hedera account id. It looks like 0.0.12345.</p>}
          </div>
          <div>
            <p className="mb-1 text-sm">What's the work?</p>
            <textarea className="field h-24 text-sm" placeholder="e.g. Design a logo for my bakery, in two colours, for print and web." value={f.scope} onChange={set("scope")} />
          </div>
          <div>
            <p className="mb-1 text-sm">What do you get at the end?</p>
            <input className="field" placeholder="e.g. Logo files in PNG and SVG" value={f.deliverable} onChange={set("deliverable")} />
            <p className="mt-1 text-xs text-muted-foreground">The finished thing that's handed over — files, an item, a service done.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-sm">Price</p>
              <div className="relative"><input className="field tnum pr-10" inputMode="decimal" placeholder="HBAR ℏ" value={f.amount} onChange={set("amount")} /><HbarLogo size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" /></div>
            </div>
            <div>
              <p className="mb-1 text-sm">Free rounds of changes</p>
              <input className="field tnum" inputMode="numeric" placeholder="e.g. 2" value={f.revisions} onChange={set("revisions")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Rounds of changes: how many times you can ask for edits before extra work costs more.</p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <Label>The deal text — share this</Label>
        <pre className="whitespace-pre-wrap rounded-md bg-graphite p-3 font-mono text-xs text-muted-foreground">{md}</pre>
        <button className="btn-ghost mt-3 w-full py-2 text-xs" onClick={() => navigator.clipboard.writeText(md).then(() => toast.success("Deal text copied"))}>Copy deal text</button>
        <p className="mt-3 text-xs text-muted-foreground">Fingerprint</p>
        <p className="break-all font-mono text-xs text-signal">{hash}</p>
      </Panel>

      <Panel className="mt-4">
        <Label>Pay with proof</Label>
        {!id ? (
          <p className="text-sm text-muted-foreground"><Link to="/wallet" className="text-signal">Create or connect a wallet</Link> first.</p>
        ) : (
          <SignButton
            accountId={id}
            disabled={!ready}
            verb={ready ? `Pay ${amount} ℏ and attach fingerprint` : "Fill in the deal first"}
            run={async (pass) => {
              const to = f.counterparty.trim();
              const block = await checkSend(id, to, amount);
              if (block) { audit({ action: "pact", detail: `${id} → ${to} ${amount} ℏ`, ok: false }); throw new Error(block); }
              const txId = await sendHbar(id, to, amount, `aurion:pact:${hash.slice(0, 64)}`, pass);
              audit({ action: "send", detail: `${id} → ${to} ${amount} ℏ (pact)`, ok: true, txId });
              return txId;
            }}
            done={(txId) => (
              <>
                <p className="font-semibold text-success">Paid. Deal fingerprint is on Hedera.</p>
                <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
              </>
            )}
          />
        )}
      </Panel>
    </div>
  );
}
