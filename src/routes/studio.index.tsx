import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, ImageIcon, MessagesSquare, Trash2, Download, Bot, ArrowUpRight, Sparkles, ArrowUp } from "lucide-react";
import { Shell, Panel, Label, AurionLogo } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { clearStudio, deleteThread, readImages, readThreads, saveImage, type SavedImage, type Thread } from "@/lib/studio-threads";
import { streamImage } from "@/lib/stream-image";
import { AgentsStudio } from "@/components/studio-agents";
import { GenerationCanvas, saveToPhone } from "@/components/generation-canvas";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "AI Studio — HashBase" },
      { name: "description", content: "Ask about your wallet, draft sends, write memos and create images with HashBase's built-in AI." },
      { property: "og:title", content: "HashBase AI Studio" },
      { property: "og:description", content: "Your Hedera wallet assistant, writer and image creator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const starters = [
  "What's in my wallet right now?",
  "Send 5 HBAR to one of my contacts",
  "Write Pact terms for a logo design job",
  "Explain my staking rewards simply",
];

function Studio() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"chat" | "images" | "agents">("chat");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [prompt, setPrompt] = useState("");
  useEffect(() => setThreads(readThreads()), []);
  const start = (prompt?: string) => nav({ to: "/studio/$threadId", params: { threadId: crypto.randomUUID() }, search: { q: prompt, agent: undefined } });

  return (
    <Shell title="Studio">
      <div className="studio-heading mb-7 flex items-center gap-4 py-3">
        <AurionLogo className="h-16 w-16 shrink-0" />
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">HashBase</p>
          <h1 className="text-3xl font-light">AI Studio</h1>
        </div>
      </div>
      <div className="studio-tabs mb-6 grid grid-cols-3 gap-1 rounded-full border border-border bg-background p-1" role="tablist" aria-label="Studio views">
        <Button role="tab" aria-selected={tab === "chat"} variant={tab === "chat" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("chat")}><MessagesSquare /> Chat</Button>
        <Button role="tab" aria-selected={tab === "images"} variant={tab === "images" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("images")}><ImageIcon /> Images</Button>
        <Button role="tab" aria-selected={tab === "agents"} variant={tab === "agents" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("agents")}><Bot /> Agents</Button>
      </div>

      <div hidden={tab !== "chat"} role="tabpanel" aria-label="Chat" className="studio-view">
          <form className="studio-composer mb-5 rounded-lg border border-border bg-card p-4" onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) start(prompt.trim()); }}>
            <Sparkles size={18} className="mb-3 text-signal" />
            <textarea aria-label="Message to HashBase" className="min-h-20 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="What’s on your mind?" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => start()}><MessageSquarePlus /> New chat</Button>
              <Button type="submit" size="icon" aria-label="Start conversation" disabled={!prompt.trim()} className="rounded-full"><ArrowUp /></Button>
            </div>
          </form>
          <div className="mb-7 grid grid-cols-2 gap-3">
            {starters.map((s) => (
              <Button key={s} variant="ghost" onClick={() => start(s)} className="studio-starter panel h-auto min-h-24 flex-col items-start justify-between gap-3 whitespace-normal p-4 text-left text-xs font-normal"><span>{s}</span><ArrowUpRight className="self-end text-muted-foreground" /></Button>
            ))}
          </div>
          <section className="border-t border-border pt-5">
            <div className="mb-3 flex items-center justify-between"><Label>Recent conversations</Label><span className="text-xs text-muted-foreground">{threads.length}</span></div>
            {threads.length === 0 ? <p className="text-sm text-muted-foreground">No chats yet.</p> : (
              <ul className="divide-y divide-border">
                {threads.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/40">
                    <MessagesSquare size={16} className="shrink-0 text-muted-foreground" />
                    <Link to="/studio/$threadId" params={{ threadId: t.id }} search={{ q: undefined, agent: t.agentId }} className="min-w-0 flex-1 py-1">
                      <p className="truncate text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.updatedAt).toLocaleString()}</p>
                    </Link>
                    <Button size="icon" variant="ghost" aria-label="Delete chat" onClick={() => { deleteThread(t.id); setThreads(readThreads()); }}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
      </div>
      <div hidden={tab !== "images"} role="tabpanel" aria-label="Images" className="studio-view"><ImageStudio /></div>
      <div hidden={tab !== "agents"} role="tabpanel" aria-label="Agents" className="studio-view"><AgentsStudio /></div>

      <Button variant="ghost" size="sm" className="mx-auto mt-8 flex text-muted-foreground hover:text-destructive" onClick={() => {
        if (confirm("Delete all Studio chats and images on this device?")) { clearStudio(); setThreads([]); location.reload(); }
      }}><Trash2 /> Clear all Studio data</Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">AI-powered. Chats and images are saved on this device only. Not financial advice.</p>
    </Shell>
  );
}

function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [final, setFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<SavedImage[]>([]);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => setSaved(readImages()), []);

  const go = async () => {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true); setErr(""); setImg(null); setFinal(false);
    abort.current = new AbortController();
    let last = "";
    try {
      await streamImage("/api/generate-image", { prompt: p }, (url, isFinal) => { last = url; setImg(url); setFinal(isFinal); }, abort.current.signal);
      if (last) { saveImage({ id: crypto.randomUUID(), prompt: p, url: last, at: Date.now() }); setSaved(readImages()); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        const m = (e as Error).message;
        setErr(m.includes(" 402") ? "AI credits are used up." : m.includes(" 429") ? "Too many requests. Try again shortly." : "Could not make that image. Try a different description.");
      }
    } finally { setBusy(false); }
  };

  return (
    <>
      <Panel>
        <Label>Create an image</Label>
        <textarea aria-label="Image description" className="field min-h-36 resize-none text-sm" maxLength={2000} placeholder="Describe your image…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {busy
          ? <Button variant="outline" className="mt-3 w-full" onClick={() => abort.current?.abort()}>Stop</Button>
          : <Button className="mt-3 w-full" disabled={!prompt.trim()} onClick={go}><ImageIcon /> Create</Button>}
        {(busy || img) && <GenerationCanvas src={img} final={final} busy={busy} alt={prompt} />}
        {img && final && !busy && <Button variant="outline" className="mt-3 w-full" onClick={() => saveToPhone(img, prompt)}><Download /> Save to phone</Button>}
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </Panel>
      {saved.length > 0 && (
        <Panel className="mt-4">
          <Label>Your images</Label>
          <div className="grid grid-cols-3 gap-2">
            {saved.map((s) => (
              <button key={s.id} type="button" onClick={() => saveToPhone(s.url, s.prompt)} className="relative block overflow-hidden rounded-lg" title={`Save: ${s.prompt}`} aria-label={`Save image: ${s.prompt}`}>
                <img src={s.url} alt={s.prompt} className="aspect-square w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-full bg-background/80 p-1"><Download className="size-3" /></span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
