import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Shell, Panel, Label, IdentityGate, BindAccount } from "@/components/aurion";
import { useAccount } from "@/lib/account";
import { getAccount, hbar } from "@/lib/hedera";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault — AURION" },
      { name: "description", content: "Your mainnet HBAR vault. Identity is checked before value moves." },
      { property: "og:title", content: "Vault — AURION" },
      { property: "og:description", content: "Hold HBAR on Hedera mainnet. AURION cannot move it unless you sign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vault,
});

function Vault() {
  const { id, ready, bind } = useAccount();
  const [copied, setCopied] = useState(false);
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => getAccount(id!), enabled: !!id, retry: false });
  if (!ready) return <Shell title="Vault"><div /></Shell>;
  if (!id) return <Shell title="Vault"><BindAccount onBind={bind} /><Link to="/wallet" className="btn-ghost mt-3 w-full">Create or connect a wallet</Link></Shell>;

  return (
    <Shell title="Vault">
      <Panel>
        <Label>Balance</Label>
        <p className="text-4xl font-semibold tnum">{acct.data ? hbar(acct.data.tinybar) : "—"} <span className="text-base text-muted-foreground">ℏ</span></p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Held in your Hedera account. AURION cannot move it unless you sign. Sends stay off until identity is approved.
        </p>
      </Panel>

      <Panel className="mt-4">
        <Label>Receive</Label>
        <div className="flex items-center gap-5">
          <div className="rounded-md bg-foreground p-2">
            <QRCodeSVG value={id} size={96} bgColor="transparent" fgColor="oklch(0.08 0.012 310)" />
          </div>
          <div>
            <p className="font-mono text-lg tnum">{id}</p>
            <button className="btn-ghost mt-2 py-2 text-xs" onClick={() => { navigator.clipboard.writeText(id); setCopied(true); }}>
              {copied ? "Copied" : "Copy account id"}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Inbound transfers are watched. Large inbounds pause sends until reviewed.</p>
      </Panel>

      <Panel className="mt-4">
        <Label>Send HBAR on mainnet</Label>
        <IdentityGate action="Send" />
      </Panel>
    </Shell>
  );
}
