import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, Copy, ImageIcon, Download, MessagesSquare } from "lucide-react";
import { Shell, SignButton, AurionLogo } from "@/components/aurion";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { MAX_FILE_BYTES, prepareFiles } from "@/lib/studio-files";
import { Paperclip, X, FileText } from "lucide-react";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { getThread, saveThread, readImages, saveImage, type SavedImage } from "@/lib/studio-threads";
import { Button } from "@/components/ui/button";
import { GenerationCanvas, saveToPhone } from "@/components/generation-canvas";
import { streamImage } from "@/lib/stream-image";
import { readContacts } from "@/lib/contacts";
import { HASHSCAN } from "@/lib/hedera";
import { getAgent, agentStatus, agentHash, actionMessage, type Agent, type AgentStatus } from "@/lib/agents";
import { Bot, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/studio/$threadId")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined, agent: typeof s["agent"] === "string" ? (s["agent"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Studio chat — Orion" },
      { name: "description", content: "Chat with Orion's AI about your Hedera wallet." },
      { property: "og:title", content: "Orion Studio chat" },
      { property: "og:description", content: "Ask, draft, write and create." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { agent: agentId } = Route.useSearch();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<AgentStatus>("unregistered");
  useEffect(() => {
    const t = getThread(threadId);
    setInitial(t?.messages ?? []);
    const a = getAgent(agentId ?? t?.agentId ?? "");
    setAgent(a);
    if (a) agentStatus(a).then(setStatus);
  }, [threadId, agentId]);
  return (
    <Shell title="Studio">
      <Link to="/studio" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> All chats</Link>
      {agent && <AgentBadge agent={agent} status={status} />}
      {initial && <ChatWindow key={threadId} threadId={threadId} initial={initial} agent={agent} agentOk={status === "verified"} />}
    </Shell>
  );
}

const startersSent = new Set<string>();
const TOOL_TITLES: Record<string, string> = { get_wallet_overview: "Reading your wallet", get_recent_activity: "Reading your activity", draft_send: "Drafting a send" };

function AgentBadge({ agent, status }: { agent: Agent; status: AgentStatus }) {
  return (
    <div className="card-surface mb-3 flex items-center gap-3 p-3">
      <Bot className="text-signal" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{agent.name}</p>
        {status === "verified" && <a className="flex items-center gap-1 text-xs text-success" target="_blank" rel="noreferrer" href={`${HASHSCAN}/topic/${agent.topicId}`}><ShieldCheck size={12} /> Agent ID {agent.topicId} · verified on Hedera</a>}
        {status === "changed" && <p className="flex items-center gap-1 text-xs text-destructive"><ShieldAlert size={12} /> Settings changed since registration. Sends are blocked until you re-register.</p>}
        {status === "unregistered" && <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldAlert size={12} /> No Agent ID yet. It can chat, but can't prepare sends.</p>}
      </div>
    </div>
  );
}

function ChatWindow({ threadId, initial, agent, agentOk }: { threadId: string; initial: UIMessage[]; agent: Agent | null; agentOk: boolean }) {
  const { q } = Route.useSearch();
  const [account, setAccount] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [composeMode, setComposeMode] = useState<"chat" | "image">("chat");
  const [images, setImages] = useState<SavedImage[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFinal, setImageFinal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [reference, setReference] = useState<SavedImage | null>(null);
  const imageAbort = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { setImages(readImages().filter((image) => image.threadId === threadId)); }, [threadId]);
  useEffect(() => () => imageAbort.current?.abort(), []);
  useEffect(() => setAccount(localStorage.getItem("aurion.account")), []);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/studio",
    body: () => ({ conversationId: threadId, accountId: localStorage.getItem("aurion.account"), contacts: readContacts().map(({ name, account }) => ({ name, account })),
      agent: agent ? { name: agent.name, instructions: agent.instructions, perms: { ...agent.perms, draftSends: agent.perms.draftSends && agentOk } } : undefined }),
  }), [threadId, agent, agentOk]);
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId, messages: initial, transport,
    onError: (e) => {
      const m = e.message;
      setErr(m);
    },
  });
  const chatBusy = status === "submitted" || status === "streaming";
  const busy = chatBusy || imageBusy;
  useEffect(() => { if (!busy) textarea.current?.focus(); }, [busy]);
  const createImage = async (prompt: string) => {
    if (!prompt || busy) return;
    setErr(""); setImageBusy(true); setPreview(null); setImageFinal(false); setImagePrompt(prompt);
    imageAbort.current = new AbortController();
    let complete: string | null = null;
    try {
      await streamImage("/api/generate-image", { prompt }, (url, final) => { setPreview(url); setImageFinal(final); if (final) complete = url; }, imageAbort.current.signal);
      if (complete) {
        const image: SavedImage = { id: crypto.randomUUID(), prompt, url: complete, at: Date.now(), threadId };
        saveImage(image); setImages((items) => [...items, image]); setPreview(null);
        if (!messages.length) saveThread(threadId, [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: `Created image: ${prompt}` }] }], agent?.id);
      }
    } catch (e) { if ((e as Error).name !== "AbortError") setErr((e as Error).message); }
    finally { setImageBusy(false); }
  };

  useEffect(() => { if (messages.length && !busy) saveThread(threadId, messages, agent?.id); }, [messages, busy, threadId, agent]);
  useEffect(() => {
    if (!q || initial.length > 0 || startersSent.has(threadId)) return;
    const t = setTimeout(() => { startersSent.add(threadId); sendMessage({ text: q }); }, 50);
    return () => clearTimeout(t);
  }, [q, initial.length, sendMessage, threadId]);

  return (
    <div className="studio-chat flex h-[calc(100dvh-15rem)] min-h-[360px] flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && images.length === 0 && !imageBusy && (
            <ConversationEmptyState icon={<AurionLogo className="h-20 w-20" sizes="80px" />} title="What’s on your mind?" description={account ? "Your wallet. Your ideas." : "A little inspiration starts here."} />
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role} className="studio-message">
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((p, i) => {
                  if (p.type === "text" && m.role === "user" && p.text.startsWith('Attached file "')) return <p key={i} className="mb-2 flex items-center gap-2 text-sm"><FileText className="size-4" />{p.text.slice(15, p.text.indexOf('":'))}</p>;
                  if (p.type === "text") return m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>;
                  if (p.type === "file") return p.mediaType?.startsWith("image/") ? <img key={i} src={p.url} alt={p.filename ?? "Attachment"} className="mb-2 max-h-56 rounded-xl" /> : <p key={i} className="mb-2 flex items-center gap-2 text-sm"><FileText className="size-4" />{p.filename ?? "Attachment"}</p>;
                  if (p.type === "reasoning") return p.text ? <details key={i} className="text-xs text-muted-foreground"><summary className="cursor-pointer">Thinking</summary><p className="mt-1 whitespace-pre-wrap">{p.text}</p></details> : null;
                  if (isToolUIPart(p)) {
                    const name = getToolName(p);
                    const out = p.state === "output-available" ? (p.output as any) : null;
                    return (
                      <div key={i}>
                        <Tool defaultOpen={false}>
                          <ToolHeader type="dynamic-tool" toolName={name} state={p.state} title={TOOL_TITLES[name] ?? name} />
                          <ToolContent>
                            <ToolInput input={p.input} />
                            <ToolOutput output={p.output} errorText={p.errorText} />
                          </ToolContent>
                        </Tool>
                        {name === "draft_send" && out?.ok && <DraftCard draft={out} agent={agent} />}
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
              {m.role === "assistant" && !busy && (
                <MessageActions>
                  <MessageAction tooltip="Copy" label="Copy" onClick={() => navigator.clipboard.writeText(m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n"))}><Copy className="size-3" /></MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}
          {images.map((image) => <Message key={image.id} from="assistant"><MessageContent className="bg-transparent"><p className="mb-2 text-sm text-muted-foreground">{image.prompt}</p><img src={image.url} alt={image.prompt} className="max-h-80 w-full rounded-lg object-contain" /><MessageActions><MessageAction label="Save image" tooltip="Save to phone" onClick={() => saveToPhone(image.url, image.prompt)}><Download className="size-4" /></MessageAction><MessageAction label="Discuss image" tooltip="Use this image in your next message" onClick={() => { setReference(image); setComposeMode("chat"); textarea.current?.focus(); }}><MessagesSquare className="size-4" /></MessageAction></MessageActions></MessageContent></Message>)}
          {imageBusy && <Message from="assistant"><MessageContent className="bg-transparent"><GenerationCanvas src={preview} final={imageFinal} busy={imageBusy} alt={imagePrompt} /></MessageContent></Message>}
          {status === "submitted" && <div className="flex items-center gap-3"><span className="relative flex h-6 w-6 items-center justify-center"><span className="absolute inset-0 animate-ping rounded-full bg-primary/30" /><span className="h-2.5 w-2.5 rounded-full bg-primary" /></span><Shimmer className="text-sm">Reading Hedera and thinking…</Shimmer></div>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {err && <p className="mb-2 text-sm text-destructive">{err}</p>}
      <PromptInput className="studio-composer mt-4" multiple maxFileSize={MAX_FILE_BYTES}
        onError={(e) => setErr(e.code === "max_file_size" ? "That file is over 20 MB." : e.message)}
        onSubmit={(msg) => {
          const t = msg.text?.trim() ?? "";
          if ((!t && !msg.files.length) || busy) return;
          if (composeMode === "image") {
            if (msg.files.length) { setErr("Image creation uses your description. Switch to Chat to discuss attachments."); return; }
            void createImage(t); return;
          }
          const { parts, skipped } = prepareFiles(msg.files);
          if (msg.files.length && !parts.length) { setErr(`Can't read ${skipped.join(", ")}. Try a photo, PDF or text file.`); return; }
          setErr(skipped.length ? `Skipped ${skipped.join(", ")} — try a photo, PDF or text file.` : "");
          sendMessage({ role: "user", parts: [...parts, ...(reference ? [{ type: "file" as const, mediaType: "image/png", url: reference.url, filename: "created-image.png" }] : []), { type: "text", text: t || "Take a look at this." }] });
          setReference(null);
        }}>
        <AttachmentChips />
        {reference && <div className="flex items-center gap-2 px-3 pt-2"><img src={reference.url} alt="Image reference" className="size-8 rounded object-cover" /><span className="flex-1 text-xs">Image attached</span><Button variant="ghost" size="icon" aria-label="Remove image reference" onClick={() => setReference(null)}><X /></Button></div>}
        <PromptInputTextarea ref={textarea} autoFocus placeholder={composeMode === "image" ? "Describe the picture you want…" : "Ask Orion anything…"} />
        <PromptInputFooter className="justify-between">
          <div className="flex items-center gap-1"><AttachButton /><Button type="button" size="sm" variant={composeMode === "image" ? "default" : "ghost"} aria-pressed={composeMode === "image"} onClick={() => { setComposeMode((mode) => mode === "image" ? "chat" : "image"); textarea.current?.focus(); }}><ImageIcon />Create image</Button></div>
          <PromptInputSubmit status={imageBusy ? "streaming" : status} onStop={() => { if (imageBusy) imageAbort.current?.abort(); else stop(); }} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

function DraftCard({ draft, agent }: { draft: { from: string; to: string; amount_hbar: number; memo: string; contact_name: string }; agent: Agent | null }) {
  return (
    <div className="card-surface mt-3 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Ready to sign</p>
      <p className="mt-1 text-2xl font-semibold tnum">{draft.amount_hbar} ℏ</p>
      <p className="mt-1 text-sm">To {draft.contact_name ? <b>{draft.contact_name} </b> : null}<span className="font-mono text-muted-foreground">{draft.to}</span></p>
      {draft.memo && <p className="mt-1 text-xs text-muted-foreground">Note: {draft.memo}</p>}
      <p className="mb-3 mt-2 text-xs text-muted-foreground">Check the account before you sign. Hedera sends can't be undone.</p>
      <SignButton accountId={draft.from} verb={`Send ${draft.amount_hbar} ℏ`} run={async (pass) => {
        const [{ checkSend, audit }, { sendHbar }] = await Promise.all([import("@/lib/guard"), import("@/lib/signer")]);
        let hash = "";
        if (agent) {
          // Re-check the agent's Hedera-registered limits right before signing.
          if ((await agentStatus(agent)) !== "verified") throw new Error("Agent ID check: settings don't match the Hedera registration. Re-register the agent.");
          if (draft.amount_hbar > agent.perms.maxPerSend) throw new Error(`Agent limit: ${agent.name} may send at most ${agent.perms.maxPerSend} ℏ`);
          if (agent.perms.contactsOnly && !readContacts().some((c) => c.account === draft.to)) throw new Error(`Agent limit: ${agent.name} may only pay saved contacts`);
          hash = await agentHash(agent);
        }
        const block = await checkSend(draft.from, draft.to, draft.amount_hbar);
        const detail = `${draft.from} → ${draft.to} ${draft.amount_hbar} ℏ`;
        if (block) { audit({ action: "blocked", detail: `${detail} · ${block}`, ok: false }); throw new Error(block); }
        try {
          const txId = await sendHbar(draft.from, draft.to, draft.amount_hbar, draft.memo, pass);
          audit({ action: "send", detail: `${detail} · via ${agent ? agent.name : "Studio"}`, ok: true, txId });
          if (agent?.topicId) {
            const { postAgentMessage } = await import("@/lib/signer");
            await postAgentMessage(draft.from, agent.topicId, actionMessage("send", { to: draft.to, amount_hbar: draft.amount_hbar, tx: txId }, hash), pass)
              .catch((e) => audit({ action: "agent log", detail: `${agent.name}: ${(e as Error).message}`, ok: false }));
          }
          return txId;
        } catch (e) { audit({ action: "send", detail: `${detail} · ${(e as Error).message}`, ok: false }); throw e; }
      }} done={(txId) => (
        <>
          <p className="font-semibold text-success">Sent on Hedera</p>
          <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
        </>
      )} />
    </div>
  );
}

function AttachButton() {
  const a = usePromptInputAttachments();
  return <button type="button" onClick={() => a.openFileDialog()} aria-label="Attach files" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"><Paperclip className="size-4" /></button>;
}

function AttachmentChips() {
  const a = usePromptInputAttachments();
  if (!a.files.length) return null;
  return (
    <div className="flex w-full flex-wrap gap-2 px-3 pt-3">
      {a.files.map((f) => (
        <span key={f.id} className="flex max-w-[12rem] items-center gap-2 rounded-xl bg-muted px-2 py-1 text-xs">
          {f.mediaType?.startsWith("image/") ? <img src={f.url} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <FileText className="size-4 shrink-0" />}
          <span className="truncate">{f.filename}</span>
          <button type="button" aria-label={`Remove ${f.filename}`} onClick={() => a.remove(f.id)}><X className="size-3" /></button>
        </span>
      ))}
    </div>
  );
}
