import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Panel, Label } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/account";
import { readKeystoreMeta, unlockKeystore, changeDeviceCode, type StoredKey } from "@/lib/keystore";
import { DeviceCode } from "@/components/device-code";
import { bioEnrolled, bioRemove } from "@/lib/biometric";
import { getLimits, setLimits, DEFAULT_LIMITS, audit } from "@/lib/guard";
import { lockOnClose, setLockOnClose } from "@/lib/lock";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ChevronRight, SlidersHorizontal, Wallet, BookUser, Activity, Shield, CircleHelp, Info, FileText, Eye, EyeOff, Copy, ShieldAlert, type LucideIcon } from "lucide-react";
import { GeneralSettings } from "@/components/general-settings";
import { ContactsPanel } from "@/components/contacts";
import { AdvancedSettings } from "@/components/advanced-settings";
import { SecurityCheck } from "@/components/security-check";
import { SecurityOptions } from "@/components/security-options";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Orion" },
      { name: "description", content: "Manage your Orion account, security, send limits and device data." },
      { property: "og:title", content: "Settings — Orion" },
      { property: "og:description", content: "Manage your Orion account, security, send limits and device data." },
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

type Category = "General" | "Accounts" | "Advanced" | "Security" | "Address book";

function Settings() {
  const [category, setCategory] = useState<Category | null>(null);
  const { id, bind } = useAccount();
  const [meta, setMeta] = useState<StoredKey | null>(null);
  const [bio, setBio] = useState(false);
  const [limits, setL] = useState(DEFAULT_LIMITS);
  const [saved, setSaved] = useState(false);
  const [lock, setLock] = useState(true);
  useEffect(() => { setMeta(readKeystoreMeta()); setBio(bioEnrolled()); setL(getLimits()); setLock(lockOnClose()); }, []);

  return (
    <Shell title="Settings">
      {category && <Button variant="ghost" className="mb-4 -ml-3" onClick={() => setCategory(null)}><ArrowLeft size={18} />Settings</Button>}
      <h1 className="mb-7 text-3xl font-semibold">{category ?? "Settings"}</h1>
      {!category && <div className="divide-y divide-border">
        <div className="pb-3">
          <SettingsItem icon={SlidersHorizontal} label="General" onClick={() => setCategory("General")} />
          <SettingsItem icon={Wallet} label="Accounts" onClick={() => setCategory("Accounts")} />
          <SettingsItem icon={BookUser} label="Address book" onClick={() => setCategory("Address book")} />
        </div>
        <div className="py-3">
          <SettingsItem icon={Activity} label="Advanced" onClick={() => setCategory("Advanced")} />
          <SettingsItem icon={Shield} label="Security" onClick={() => setCategory("Security")} />
        </div>
        <div className="pt-3">
          <SettingsLink icon={CircleHelp} label="About Orion" to="/about" />
          <SettingsLink icon={Info} label="Company" to="/company" />
          <SettingsLink icon={Shield} label="Privacy Policy" to="/privacy" />
          <SettingsLink icon={FileText} label="Terms & Conditions" to="/terms" />
        </div>
      </div>}
      <div className="space-y-4">
        {category === "Accounts" && <Panel>
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
        </Panel>}

        {category === "Security" && <h2 className="-mx-5 bg-secondary px-5 py-3 text-sm font-semibold">Authentication</h2>}
        {category === "Security" && meta && <ChangeCode onChanged={() => { setMeta(readKeystoreMeta()); setBio(bioEnrolled()); }} />}

        {category === "Security" && <Panel>
          <Label>Biometric authentication</Label>
          <div className="flex items-center justify-between text-sm">
            <span>Face ID / fingerprint</span>
            {bio ? <Button size="sm" variant="ghost" onClick={() => { bioRemove(); setBio(false); }}>Turn off</Button>
              : meta ? <BioTurnOn onOn={() => setBio(true)} /> : <span className="text-xs text-muted-foreground">Needs a key on this device</span>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/50 pt-4 text-sm">
            <div>
              <p>Lock when app closes</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reopening asks for {bio ? "Face ID or your passphrase" : "your passphrase"}. Minimizing stays unlocked.
              </p>
            </div>
            <Switch
              checked={lock}
              aria-label="Lock when app closes"
              onCheckedChange={(v) => { setLockOnClose(v); setLock(v); }}
            />
          </div>
        </Panel>}

        {category === "Security" && <SecurityOptions />}
        {category === "Security" && <SecurityCheck id={id} />}
        {category === "Security" && meta && <RevealKey />}

        {category === "General" && <GeneralSettings />}
        {category === "Address book" && <ContactsPanel unframed />}
        {category === "Advanced" && <AdvancedSettings />}

        {category === "Advanced" && <Panel>
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
        </Panel>}

        {category === "Advanced" && <Panel>
          <Label>App</Label>
          <div className="space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={async () => { const ok = await navigator.storage?.persist?.(); alert(ok ? "Storage is protected on this device." : "Your browser didn't allow it."); }}>Keep my data from being cleared</Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { if (confirm("Delete all AI Studio chats and images on this device?")) { localStorage.removeItem("aurion.studio.threads"); localStorage.removeItem("aurion.studio.images"); } }}>Clear AI Studio data</Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { if (confirm("Clear the activity log on this device?")) localStorage.removeItem("aurion.audit"); }}>Clear activity log</Button>
            <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/about">About Orion</Link></Button>
          </div>
        </Panel>}
      </div>
    </Shell>
  );
}


function SettingsItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <Button variant="ghost" onClick={onClick} className="h-16 w-full justify-start gap-5 rounded-none px-1 text-base font-medium"><Icon size={23} strokeWidth={1.7} /><span className="flex-1 text-left">{label}</span><ChevronRight size={20} className="text-muted-foreground" /></Button>;
}

function SettingsLink({ icon: Icon, label, to, section }: { icon: LucideIcon; label: string; to: "/vault" | "/about" | "/company" | "/privacy" | "/terms"; section?: string }) {
  return <Button asChild variant="ghost" className="h-16 w-full justify-start gap-5 rounded-none px-1 text-base font-medium"><Link to={to} search={section ? { section } : {}}><Icon size={23} strokeWidth={1.7} /><span className="flex-1 text-left">{label}</span><ChevronRight size={20} className="text-muted-foreground" /></Link></Button>;
}

function ChangeCode({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return <Panel><Label>Device code</Label>
    <p className="text-xs text-muted-foreground">Change the code for this wallet only. Other saved wallets keep their existing passwords.</p>
    {!open ? <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>Set or change code</Button> : <>
      <input className="field mt-3" type="password" aria-label="Current device password" placeholder="Current code or passphrase" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <DeviceCode busy={busy || !current} cta="Change code" onSubmit={async (code, biometric) => {
        setBusy(true); setError(""); setDone(false);
        try {
          await changeDeviceCode(current, code);
          setCurrent(""); setOpen(false); setDone(true); onChanged();
          if (biometric) {
            try { await (await import("@/lib/biometric")).bioEnroll(code); onChanged(); }
            catch (e) { setError(`Code changed. Biometrics were not enabled: ${(e as Error).message}`); }
          }
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
      }} />
    </>}
    {done && <p role="status" className="mt-2 text-sm text-success">Device code changed.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </Panel>;
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
