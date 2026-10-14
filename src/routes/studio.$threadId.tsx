import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
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

export const Route = createFileRoute("/studio/$threadId")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Studio chat — AURION" },
      { name: "description", content: "Chat with AURION's AI about your Hedera wallet." },
      { property: "og:title", content: "AURION Studio chat" },
      { property: "og:description", content: "Ask, draft, write and create." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  useEffect(() => { setInitial(getThread(threadId)?.messages ?? []); }, [threadId]);
  return (
    <Shell title="Studio">
      <Link to="/studio" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> All chats</Link>
      {initial && <ChatWindow key={threadId} threadId={threadId} initial={initial} />}
    </Shell>
  );
}

const TOOL_TITLES: Record<string, string> = { get_wallet_overview: "Reading your wallet", get_recent_activity: "Reading your activity", draft_send: "Drafting a send" };

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const { q } = Route.useSearch();
  const [account, setAccount] = useState<string | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => setAccount(localStorage.getItem("aurion.account")), []);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/studio",
    body: () => ({ conversationId: threadId, accountId: localStorage.getItem("aurion.account"), contacts: readContacts().map(({ name, account }) => ({ name, account })) }),
  }), [threadId]);
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId, messages: initial, transport,
    onError: (e) => {
      const m = e.message;
      setErr(/402|credits/i.test(m) ? "AI credits are used up." : /429/.test(m) ? "Too many messages. Try again shortly." : "Could not reach AI Studio. Check your connection and try again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => { if (messages.length && !busy) saveThread(threadId, messages); }, [messages, busy, threadId]);
  const sentStarter = useRef(false);
  useEffect(() => {
    if (q && !sentStarter.current && initial.length === 0) { sentStarter.current = true; sendMessage({ text: q }); }
  }, [q, initial.length, sendMessage]);

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState icon={<AurionLogo className="h-16 w-16" />} title="AURION Studio" description={account ? "Ask about your wallet, draft a send, or have me write something." : "Set up a wallet to ask about balances. Writing works now."} />
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
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
                        {name === "draft_send" && out?.ok && <DraftCard draft={out} />}
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
          {status === "submitted" && <Shimmer className="text-sm">Thinking…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {err && <p className="mb-2 text-sm text-destructive">{err}</p>}
      <PromptInput className="mt-3" onSubmit={(msg) => { const t = msg.text?.trim(); if (!t || busy) return; setErr(""); sendMessage({ text: t }); }}>
        <PromptInputTextarea autoFocus placeholder="Ask AURION anything…" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

function DraftCard({ draft }: { draft: { from: string; to: string; amount_hbar: number; memo: string; contact_name: string } }) {
  return (
    <div className="mt-3 rounded-xl border border-primary/50 bg-secondary/40 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Ready to sign</p>
      <p className="mt-1 text-2xl font-semibold tnum">{draft.amount_hbar} ℏ</p>
      <p className="mt-1 text-sm">To {draft.contact_name ? <b>{draft.contact_name} </b> : null}<span className="font-mono text-muted-foreground">{draft.to}</span></p>
      {draft.memo && <p className="mt-1 text-xs text-muted-foreground">Note: {draft.memo}</p>}
      <p className="mb-3 mt-2 text-xs text-muted-foreground">Check the account before you sign. Hedera sends can't be undone.</p>
      <SignButton accountId={draft.from} verb={`Send ${draft.amount_hbar} ℏ`} run={async (pass) => {
        const [{ checkSend, audit }, { sendHbar }] = await Promise.all([import("@/lib/guard"), import("@/lib/signer")]);
        const block = await checkSend(draft.from, draft.to, draft.amount_hbar);
        const detail = `${draft.from} → ${draft.to} ${draft.amount_hbar} ℏ`;
        if (block) { audit({ action: "blocked", detail: `${detail} · ${block}`, ok: false }); throw new Error(block); }
        try {
          const txId = await sendHbar(draft.from, draft.to, draft.amount_hbar, draft.memo, pass);
          audit({ action: "send", detail: `${detail} · via Studio`, ok: true, txId });
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
