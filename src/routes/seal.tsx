import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Panel, Label, IdentityGate } from "@/components/aurion";
import { sha256Hex } from "@/lib/hedera";

export const Route = createFileRoute("/seal")({
  head: () => ({
    meta: [
      { title: "Seal — AURION" },
      { name: "description", content: "Prove a file existed at a Hedera consensus time. The file stays with you." },
      { property: "og:title", content: "Seal — AURION" },
      { property: "og:description", content: "Hash in your browser. Seal the hash on Hedera mainnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Seal,
});

const classes = ["Human", "AI-assisted", "AI-generated", "Mixed"] as const;

function Seal() {
  const [hash, setHash] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [cls, setCls] = useState<string>("");
  const [model, setModel] = useState("");

  const onFile = async (f?: File) => {
    if (!f) return;
    setName(f.name);
    setHash(await sha256Hex(await f.arrayBuffer()));
  };

  return (
    <Shell title="Seal">
      <Panel>
        <Label>1 · Source</Label>
        <label className="block cursor-pointer rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {name || "Drop a file or tap to choose"}
        </label>
        <textarea className="field mt-3 h-24 text-sm" placeholder="…or paste text" value={text}
          onChange={async (e) => { setText(e.target.value); setName(""); setHash(e.target.value ? await sha256Hex(e.target.value) : ""); }} />
        {hash && <p className="mt-3 break-all font-mono text-xs text-signal">sha256 {hash}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Hashed in your browser. The file is never uploaded.</p>
      </Panel>

      <Panel className="mt-4">
        <Label>2 · Creation class</Label>
        <div className="grid grid-cols-2 gap-2">
          {classes.map((c) => (
            <button key={c} onClick={() => setCls(c)}
              className={`btn-ghost text-sm ${cls === c ? "border-primary text-primary" : ""}`}>{c}</button>
          ))}
        </div>
        <input className="field mt-3 text-sm" placeholder="Model name (optional)" maxLength={60} value={model} onChange={(e) => setModel(e.target.value)} />
      </Panel>

      <Panel className="mt-4">
        <Label>3 · Seal on mainnet</Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Public: the hash, creation class and model name. Not a copyright registration.
        </p>
        <IdentityGate action="Seal" />
      </Panel>

      <Link to="/verify" className="mt-6 block text-center text-sm text-signal">Verify an existing seal →</Link>
    </Shell>
  );
}
