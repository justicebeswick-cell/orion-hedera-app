import { useEffect, useState, useSyncExternalStore } from "react";
import { Globe, Link2, ScanLine, Plus, X, ExternalLink, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/aurion";
import { QrScanner } from "@/components/qr-scanner";

type Mod = typeof import("@/lib/dapp-wallet");
const empty: import("@/lib/dapp-wallet").State = { ready: false, error: "", pending: [], sessions: [] };

export function useDappWallet() {
  const [mod, setMod] = useState<Mod | null>(null);
  useEffect(() => { import("@/lib/dapp-wallet").then(setMod); }, []);
  const state = useSyncExternalStore(mod?.subscribe ?? (() => () => {}), mod?.snapshot ?? (() => empty), () => empty);
  return { mod, state };
}

export function DappBrowser() {
  const { mod, state } = useDappWallet();
  const [url, setUrl] = useState("");
  const [uri, setUri] = useState("");
  const [msg, setMsg] = useState("");
  const [scan, setScan] = useState(false);
  const [marks, setMarks] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => { if (mod) { setMarks(mod.readBookmarks()); mod.startWallet().catch((e) => setMsg(e.message)); } }, [mod]);

  const normal = (u: string) => /^https?:\/\//i.test(u) ? u : `https://${u}`;
  const open = (u: string) => window.open(normal(u), "_blank", "noopener,noreferrer");
  const connect = async (link: string) => {
    if (!mod) return; setMsg("Connecting…");
    try { await mod.pair(link); setMsg("Waiting for the dApp. Review the request below."); setUri(""); } catch (e) { setMsg((e as Error).message); }
  };
  const addMark = () => {
    if (!url.trim() || !mod) return;
    const u = normal(url.trim()); const next = [...marks.filter((m) => m.url !== u), { name: new URL(u).hostname.replace(/^www\./, ""), url: u }];
    setMarks(next); mod.saveBookmarks(next);
  };
  const removeMark = (u: string) => { const next = marks.filter((m) => m.url !== u); setMarks(next); mod?.saveBookmarks(next); };

  return (
    <div className="space-y-6">
      <form className="panel flex items-center gap-2 p-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) open(url.trim()); }}>
        <Globe size={18} className="ml-2 shrink-0 text-muted-foreground" />
        <input aria-label="dApp address" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" placeholder="Enter a dApp address" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="button" size="icon" variant="ghost" aria-label="Bookmark" onClick={addMark}><Plus /></Button>
        <Button type="submit" size="sm" className="rounded-full">Open</Button>
      </form>

      <section>
        <Label>Bookmarks</Label>
        <div className="grid grid-cols-2 gap-2">
          {marks.map((m) => (
            <div key={m.url} className="panel flex items-center gap-2 p-3">
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => open(m.url)}>
                <img src={`${new URL(m.url).origin}/favicon.ico`} alt="" className="size-5 rounded" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                <span className="truncate text-sm">{m.name}</span>
              </button>
              <button aria-label={`Remove ${m.name}`} className="text-muted-foreground" onClick={() => removeMark(m.url)}><X size={14} /></button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">dApps open in a new tab. Choose WalletConnect there, copy or scan the code, and connect it below.</p>
      </section>

      <section className="panel p-4">
        <Label>Connect a dApp</Label>
        <div className="flex gap-2">
          <input aria-label="WalletConnect link" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Paste wc: link" value={uri} onChange={(e) => setUri(e.target.value)} />
          <Button size="icon" variant="ghost" aria-label="Scan QR code" onClick={() => setScan(true)}><ScanLine /></Button>
          <Button size="sm" disabled={!uri.trim()} onClick={() => connect(uri)}><Link2 /> Connect</Button>
        </div>
        {(msg || state.error) && <p className="mt-2 text-xs text-muted-foreground">{state.error || msg}</p>}
      </section>

      <section>
        <Label>Connected dApps</Label>
        {state.sessions.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <ul className="divide-y divide-border">
            {state.sessions.map((s) => (
              <li key={s.topic} className="flex items-center gap-3 py-3">
                {s.icon ? <img src={s.icon} alt="" className="size-7 rounded" /> : <Globe size={20} />}
                <div className="min-w-0 flex-1"><p className="truncate text-sm">{s.name}</p><p className="truncate text-xs text-muted-foreground">{s.url}</p></div>
                <Button size="icon" variant="ghost" aria-label={`Open ${s.name}`} onClick={() => open(s.url)}><ExternalLink /></Button>
                <Button size="icon" variant="ghost" aria-label={`Disconnect ${s.name}`} onClick={() => mod?.disconnect(s.topic)}><Unplug /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {scan && <QrScanner raw onClose={() => setScan(false)} onResult={(t) => { setScan(false); setUri(t); void connect(t); }} />}
    </div>
  );
}
