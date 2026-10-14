import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, ImageIcon, MessagesSquare, Trash2, Download } from "lucide-react";
import { Shell, Panel, Label, AurionLogo } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { clearStudio, deleteThread, readImages, readThreads, saveImage, type SavedImage, type Thread } from "@/lib/studio-threads";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "AI Studio — AURION" },
      { name: "description", content: "Ask about your wallet, draft sends, write memos and create images with AURION's built-in AI." },
      { property: "og:title", content: "AURION AI Studio" },
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
  const [tab, setTab] = useState<"chat" | "images">("chat");
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => setThreads(readThreads()), []);
  const start = (prompt?: string) => nav({ to: "/studio/$threadId", params: { threadId: crypto.randomUUID() }, search: { q: prompt } });

  return (
    <Shell title="Studio">
      <div className="mb-6 flex items-center gap-4">
        <AurionLogo className="h-14 w-14" />
        <div>
          <p className="text-xs text-signal">AURION / STUDIO</p>
          <h1 className="text-2xl font-semibold">AI Studio</h1>
          <p className="text-sm text-muted-foreground">Ask, draft, write and create.</p>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-border p-1" role="tablist">
        <Button role="tab" aria-selected={tab === "chat"} variant={tab === "chat" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("chat")}><MessagesSquare /> Chat</Button>
        <Button role="tab" aria-selected={tab === "images"} variant={tab === "images" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("images")}><ImageIcon /> Images</Button>
      </div>

      {tab === "chat" ? (
        <>
          <Button className="mb-4 w-full" onClick={() => start()}><MessageSquarePlus /> New chat</Button>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {starters.map((s) => (
              <button key={s} onClick={() => start(s)} className="panel p-3 text-left text-sm transition-colors hover:border-primary">{s}</button>
            ))}
          </div>
          <Panel>
            <Label>Past chats</Label>
            {threads.length === 0 ? <p className="text-sm text-muted-foreground">No chats yet.</p> : (
              <ul className="divide-y divide-border">
                {threads.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2">
                    <Link to="/studio/$threadId" params={{ threadId: t.id }} search={{ q: undefined }} className="min-w-0 flex-1 py-1">
                      <p className="truncate text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.updatedAt).toLocaleString()}</p>
                    </Link>
                    <Button size="icon" variant="ghost" aria-label="Delete chat" onClick={() => { deleteThread(t.id); setThreads(readThreads()); }}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : <ImageStudio />}

      <Button variant="outline" className="mt-6 w-full text-destructive" onClick={() => {
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
        <textarea className="field min-h-24 resize-none text-sm" maxLength={2000} placeholder="A neon purple vault door floating in space, cinematic" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {busy
          ? <Button variant="outline" className="mt-3 w-full" onClick={() => abort.current?.abort()}>Stop</Button>
          : <Button className="mt-3 w-full" disabled={!prompt.trim()} onClick={go}><ImageIcon /> Create</Button>}
        {busy && !img && <p className="mt-4 text-center text-sm text-muted-foreground">Painting…</p>}
        {img && (
          <div className="mt-4 overflow-hidden rounded-xl">
            <img src={img} alt={prompt} className={`w-full transition-[filter] duration-500 ${final ? "blur-0" : "blur-2xl"}`} />
          </div>
        )}
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </Panel>
      {saved.length > 0 && (
        <Panel className="mt-4">
          <Label>Your images</Label>
          <div className="grid grid-cols-3 gap-2">
            {saved.map((s) => (
              <a key={s.id} href={s.url} download={`aurion-${s.id.slice(0, 6)}.png`} className="group relative block overflow-hidden rounded-lg" title={s.prompt}>
                <img src={s.url} alt={s.prompt} className="aspect-square w-full object-cover" />
                <Download className="absolute bottom-1 right-1 size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
