import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquarePlus, ImageIcon, MessagesSquare, Trash2, Bot, Compass, ArrowUpRight, Sparkles, ArrowUp } from "lucide-react";
import { Shell, Label } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { clearStudio, deleteThread, readThreads, readImages, type SavedImage, type Thread } from "@/lib/studio-threads";
import { saveToPhone } from "@/components/generation-canvas";
import { AgentsStudio } from "@/components/studio-agents";
import { DappBrowser } from "@/components/dapp-browser";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "AI Studio — Orion" },
      { name: "description", content: "Ask about your wallet, draft sends, write memos and create images with Orion's built-in AI." },
      { property: "og:title", content: "Orion AI Studio" },
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
  const [tab, setTab] = useState<"chat" | "agents" | "discover">("chat");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [images, setImages] = useState<SavedImage[]>([]);
  const [prompt, setPrompt] = useState("");
  useEffect(() => { setThreads(readThreads()); setImages(readImages()); }, []);
  const start = (prompt?: string) => nav({ to: "/studio/$threadId", params: { threadId: crypto.randomUUID() }, search: { q: prompt, agent: undefined } });

  return (
    <Shell title="Studio">
      <div className="studio-heading mb-7 py-3">
        <h1 className="text-3xl font-light">AI Studio</h1>
      </div>
      <div className="studio-tabs mb-6 grid grid-cols-3 gap-1 rounded-full border border-border bg-background p-1" role="tablist" aria-label="Studio views">
        <Button role="tab" aria-selected={tab === "chat"} variant={tab === "chat" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("chat")}><MessagesSquare /> Chat</Button>
        <Button role="tab" aria-selected={tab === "agents"} variant={tab === "agents" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("agents")}><Bot /> Agents</Button>
        <Button role="tab" aria-selected={tab === "discover"} variant={tab === "discover" ? "default" : "ghost"} className="rounded-full" onClick={() => setTab("discover")}><Compass /> Discover</Button>
      </div>

      <div hidden={tab !== "chat"} role="tabpanel" aria-label="Chat" className="studio-view">
          <form className="studio-composer mb-5 rounded-lg border border-border bg-card p-4" onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) start(prompt.trim()); }}>
            <Sparkles size={18} className="mb-3 text-signal" />
            <textarea aria-label="Message to Orion" className="min-h-20 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="What’s on your mind?" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
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
          {images.length > 0 && <section className="mt-6 border-t border-border pt-5"><Label>Created images</Label><div className="grid grid-cols-3 gap-2">{images.map((image) => <Button key={image.id} variant="ghost" className="h-auto overflow-hidden rounded-lg p-0" aria-label={`Save image: ${image.prompt}`} onClick={() => saveToPhone(image.url, image.prompt)}><img src={image.url} alt={image.prompt} className="aspect-square w-full object-cover" /></Button>)}</div></section>}
      </div>
      <div hidden={tab !== "agents"} role="tabpanel" aria-label="Agents" className="studio-view"><AgentsStudio /></div>
      <div hidden={tab !== "discover"} role="tabpanel" aria-label="Discover" className="studio-view"><DappBrowser /></div>

      <Button variant="ghost" size="sm" className="mx-auto mt-8 flex text-muted-foreground hover:text-destructive" onClick={() => {
        if (confirm("Delete all Studio chats and images on this device?")) { clearStudio(); setThreads([]); location.reload(); }
      }}><Trash2 /> Clear all Studio data</Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">AI-powered. Chats and images are saved on this device only. Not financial advice.</p>
    </Shell>
  );
}
