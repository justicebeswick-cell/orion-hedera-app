import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { Shell, SignButton, AurionLogo } from "@/components/aurion";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { getThread, saveThread } from "@/lib/studio-threads";
import { readContacts } from "@/lib/contacts";
import { HASHSCAN } from "@/lib/hedera";
import { getAgent, agentStatus, agentHash, actionMessage, type Agent, type AgentStatus } from "@/lib/agents";
import { Bot, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/studio/$threadId")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined, agent: typeof s["agent"] === "string" ? (s["agent"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Studio chat — HashBase" },
      { name: "description", content: "Chat with HashBase's AI about your Hedera wallet." },
      { property: "og:title", content: "HashBase Studio chat" },
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
      setErr(/402|credits/i.test(m) ? "AI credits are used up." : /429/.test(m) ? "Too many messages. Try again shortly." : "Could not reach AI Studio. Check your connection and try again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

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
          {messages.length === 0 && (
            <ConversationEmptyState icon={<AurionLogo className="h-20 w-20" />} title="What’s on your mind?" description={account ? "Your wallet. Your ideas." : "A little inspiration starts here."} />
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role} className="studio-message">
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>;
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
          const { parts, skipped } = prepareFiles(msg.files);
          if (msg.files.length && !parts.length) { setErr(`Can't read ${skipped.join(", ")}. Try a photo, PDF or text file.`); return false as never; }
          setErr(skipped.length ? `Skipped ${skipped.join(", ")} — try a photo, PDF or text file.` : "");
          sendMessage({ role: "user", parts: [...parts, { type: "text", text: t || "Take a look at this." }] });
        }}>
        <AttachmentChips />
        <PromptInputTextarea autoFocus placeholder="Ask HashBase anything…" />
        <PromptInputFooter className="justify-between">
          <AttachButton />
          <PromptInputSubmit status={status} onStop={stop} />
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
