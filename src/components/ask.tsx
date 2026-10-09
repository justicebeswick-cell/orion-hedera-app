import { useRef, useState } from "react";
import { Panel, Label } from "@/components/aurion";

const suggestions = ["What did I spend last week?", "Who sent me HBAR recently?", "How much have I earned staking?"];

export function AskActivity({ accountId }: { accountId: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const abort = useRef<AbortController | null>(null);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setQ(question); setAnswer(""); setErr(""); setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, question }), signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(res.status === 402 ? "AI credits are used up." : res.status === 429 ? "Too many questions. Try again shortly." : j.error || "Could not answer.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Panel className="mt-6">
      <Label>Ask about your activity</Label>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <input className="field text-sm" placeholder="Ask about your balance or transfers" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} />
        {busy ? (
          <button type="button" className="btn-ghost px-4" onClick={() => abort.current?.abort()}>Stop</button>
        ) : (
          <button className="btn px-4" disabled={!q.trim()}>Ask</button>
        )}
      </form>
      {!answer && !busy && !err && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{s}</button>
          ))}
        </div>
      )}
      {busy && !answer && <p className="mt-4 text-sm text-muted-foreground">Reading mainnet…</p>}
      {answer && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <p className="mt-3 text-xs text-muted-foreground">AI-powered. Uses your public on-chain history only. Not financial advice.</p>
    </Panel>
  );
}
