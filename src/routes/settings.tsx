import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Panel, Label } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/account";
import { readKeystoreMeta, unlockKeystore, type StoredKey } from "@/lib/keystore";
import { bioEnrolled, bioRemove } from "@/lib/biometric";
import { getLimits, setLimits, DEFAULT_LIMITS, audit } from "@/lib/guard";
import { roundOn, setRound as saveRound } from "@/lib/display";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Copy, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HashBase" },
      { name: "description", content: "Manage your HashBase account, security, send limits and device data." },
      { property: "og:title", content: "Settings — HashBase" },
      { property: "og:description", content: "Manage your HashBase account, security, send limits and device data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate font-mono text-xs">{v}</span>
    </div>
  );
}

function Settings() {
  const { id, bind } = useAccount();
  const [meta, setMeta] = useState<StoredKey | null>(null);
  const [bio, setBio] = useState(false);
  const [limits, setL] = useState(DEFAULT_LIMITS);
  const [saved, setSaved] = useState(false);
  const [round, setRound] = useState(false);
  useEffect(() => { setMeta(readKeystoreMeta()); setBio(bioEnrolled()); setL(getLimits()); setRound(roundOn()); }, []);

  return (
    <Shell title="Settings">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <div className="space-y-4">
        <Panel>
          <Label>Account</Label>
          <Row k="Account" v={id ?? "Not signed in"} />
          <Row k="Signs with" v={meta ? "This device" : id ? "Wallet app or view only" : "—"} />
          {meta && <Row k="Key type" v={(meta.kind ?? "ecdsa").toUpperCase()} />}
          {meta?.evm && <Row k="EVM address" v={meta.evm} />}
          <Row k="Network" v="Hedera mainnet" />
          <div className="mt-4 flex gap-2">
            <Button asChild variant="secondary" size="sm"><Link to="/wallet">Switch wallet</Link></Button>
            {id && <Button variant="ghost" size="sm" onClick={() => { if (confirm("Sign out on this device? Your saved key stays.")) bind(null); }}>Sign out</Button>}
          </div>
        </Panel>

        {meta && <RevealKey />}

        <Panel>
          <Label>Security</Label>
          <div className="flex items-center justify-between text-sm">
            <span>Face ID / fingerprint</span>
            {bio ? <Button size="sm" variant="ghost" onClick={() => { bioRemove(); setBio(false); }}>Turn off</Button>
              : meta ? <BioTurnOn onOn={() => setBio(true)} /> : <span className="text-xs text-muted-foreground">Needs a key on this device</span>}
          </div>
        </Panel>

        <Panel>
          <Label>Display</Label>
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p>Hide decimals</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Show 313,307 instead of 313,307.34563574. Amounts under 1 keep their decimals.</p>
            </div>
            <Switch
              checked={round}
              aria-label="Hide decimals"
              onCheckedChange={(v) => { saveRound(v); setRound(v); }}
            />
          </div>
        </Panel>

        <Panel>
          <Label>Send limits (HBAR)</Label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Per send
              <Input type="number" min={0} value={limits.perSend} onChange={(e) => setL({ ...limits, perSend: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-muted-foreground">Per day
              <Input type="number" min={0} value={limits.perDay} onChange={(e) => setL({ ...limits, perDay: Number(e.target.value) })} />
            </label>
          </div>
          <Button className="mt-3" size="sm" onClick={() => { setLimits(limits); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>{saved ? "Saved" : "Save limits"}</Button>
        </Panel>

        <Panel>
          <Label>App</Label>
          <div className="space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={async () => { const ok = await navigator.storage?.persist?.(); alert(ok ? "Storage is protected on this device." : "Your browser didn't allow it."); }}>Keep my data from being cleared</Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { if (confirm("Delete all AI Studio chats and images on this device?")) { localStorage.removeItem("aurion.studio.threads"); localStorage.removeItem("aurion.studio.images"); } }}>Clear AI Studio data</Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { if (confirm("Clear the activity log on this device?")) localStorage.removeItem("aurion.audit"); }}>Clear activity log</Button>
            <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/about">About HashBase</Link></Button>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}

function RevealKey() {
  const [pass, setPass] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Hide again after 60 seconds.
  useEffect(() => { if (!key) return; const t = setTimeout(() => { setKey(null); setShow(false); }, 60000); return () => clearTimeout(t); }, [key]);

  const reveal = async () => {
    setBusy(true); setErr("");
    try {
      setKey(await unlockKeystore(pass));
      setPass("");
      audit({ action: "reveal key", detail: "Private key shown in Settings", ok: true });
    } catch (e) { setErr(e instanceof Error ? e.message : "Wrong passphrase"); }
    finally { setBusy(false); }
  };

  return (
    <Panel>
      <Label>Private key</Label>
      <p className="mb-3 flex gap-2 text-xs text-muted-foreground"><ShieldAlert size={16} className="shrink-0 text-destructive" />Anyone with this key controls your money. Never share it or paste it into a website.</p>
      {!key ? (
        <div className="flex gap-2">
          <Input type="password" placeholder="Your passphrase" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pass && reveal()} autoComplete="current-password" />
          <Button disabled={!pass || busy} onClick={reveal}>{busy ? "Checking…" : "Show"}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="break-all rounded-md bg-graphite p-3 font-mono text-xs">{show ? key : "•".repeat(48)}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}{show ? "Hide" : "Reveal"}</Button>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(key)}><Copy />Copy</Button>
            <Button size="sm" variant="ghost" onClick={() => { setKey(null); setShow(false); }}>Lock</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Hides itself after 60 seconds.</p>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </Panel>
  );
}

function BioTurnOn({ onOn }: { onOn: () => void }) {
  const [pass, setPass] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Turn on</Button>;
  return (
    <div className="flex flex-col items-end gap-2">
      <Input type="password" placeholder="Device passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
      <Button size="sm" disabled={!pass} onClick={async () => {
        setErr("");
        try { await unlockKeystore(pass); await (await import("@/lib/biometric")).bioEnroll(pass); onOn(); }
        catch (e) { setErr((e as Error).message); }
      }}>Turn on Face ID / fingerprint</Button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
