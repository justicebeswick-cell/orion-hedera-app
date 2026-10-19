import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Plus, Play, Trash2, ShieldCheck, ShieldAlert, Pencil, X } from "lucide-react";
import { Panel, Label, SignButton } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { HASHSCAN } from "@/lib/hedera";
import { DEFAULT_PERMS, agentHash, agentStatus, deleteAgent, registrationMessage, saveAgent, useAgents, type Agent, type AgentStatus } from "@/lib/agents";

export function AgentsStudio() {
  const agents = useAgents();
  const [edit, setEdit] = useState<Agent | null>(null);
  const blank = (): Agent => ({ id: crypto.randomUUID(), name: "", instructions: "", tasks: [], perms: { ...DEFAULT_PERMS }, createdAt: Date.now() });
  if (edit) return <AgentEditor agent={edit} onClose={() => setEdit(null)} />;
  return (
    <>
      <Panel className="mb-4">
        <Label>Your agents</Label>
        <p className="text-sm text-muted-foreground">Make AI helpers with a name, a job and tasks. Each gets an <b>Agent ID</b> on Hedera: a public record, only you can write to, of what it's allowed to do and everything it sends.</p>
        <Button className="mt-4 w-full" onClick={() => setEdit(blank())}><Plus /> Create agent</Button>
      </Panel>
      {agents.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No agents yet.</p>}
      <div className="space-y-3">{agents.map((a) => <AgentCard key={a.id} agent={a} onEdit={() => setEdit(a)} />)}</div>
    </>
  );
}

function useStatus(a: Agent) {
  const [s, setS] = useState<AgentStatus>("unregistered");
  useEffect(() => { agentStatus(a).then(setS); }, [a]);
  return s;
}

function StatusLine({ agent, status }: { agent: Agent; status: AgentStatus }) {
  if (status === "verified") return <a target="_blank" rel="noreferrer" href={`${HASHSCAN}/topic/${agent.topicId}`} className="flex items-center gap-1 text-xs text-success"><ShieldCheck size={12} /> Agent ID {agent.topicId}</a>;
  if (status === "changed") return <p className="flex items-center gap-1 text-xs text-destructive"><ShieldAlert size={12} /> Changed since registration. Re-register to allow sends.</p>;
  return <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldAlert size={12} /> Not registered on Hedera</p>;
}

function AgentCard({ agent, onEdit }: { agent: Agent; onEdit: () => void }) {
  const nav = useNavigate();
  const status = useStatus(agent);
  const [owner, setOwner] = useState<string | null>(null);
  const [task, setTask] = useState("");
  useEffect(() => setOwner(localStorage.getItem("aurion.account")), []);
  const run = (q: string) => nav({ to: "/studio/$threadId", params: { threadId: crypto.randomUUID() }, search: { q, agent: agent.id } });
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-signal"><Bot size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{agent.name}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{agent.instructions}</p>
          <div className="mt-1"><StatusLine agent={agent} status={status} /></div>
        </div>
        <Button size="icon" variant="ghost" aria-label={`Edit ${agent.name}`} onClick={onEdit}><Pencil /></Button>
        <Button size="icon" variant="ghost" aria-label={`Delete ${agent.name}`} onClick={() => { if (confirm(`Delete ${agent.name}? Its Hedera record stays public.`)) deleteAgent(agent.id); }}><Trash2 /></Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {agent.perms.readWallet ? "Reads your wallet" : "No wallet access"} · {agent.perms.draftSends ? `Prepares sends up to ${agent.perms.maxPerSend} ℏ${agent.perms.contactsOnly ? " to contacts" : ""}` : "Can't prepare sends"} · You sign everything
      </p>
      {agent.tasks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.tasks.map((t) => <button key={t} onClick={() => run(t)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary"><Play size={10} /> {t}</button>)}
        </div>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (task.trim()) run(task.trim()); }}>
        <input className="field py-2 text-sm" placeholder="Give it a task…" value={task} onChange={(e) => setTask(e.target.value)} />
        <Button disabled={!task.trim()}>Run</Button>
      </form>
      {status !== "verified" && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs text-muted-foreground">Register its Agent ID on Hedera. Network fee ≈ 0.02 ℏ, plus ≈ 0.0008 ℏ to log each send it makes.</p>
          <SignButton accountId={owner} verb={status === "changed" ? "Re-register Agent ID" : "Register Agent ID"} run={async (pass) => {
            const { createAgentTopic, postAgentMessage } = await import("@/lib/signer");
            const hash = await agentHash(agent);
            const msg = registrationMessage(agent, owner!, hash);
            if (agent.topicId && agent.owner === owner) {
              const txId = await postAgentMessage(owner!, agent.topicId, msg, pass);
              saveAgent({ ...agent, registeredHash: hash, registerTx: txId });
              return txId;
            }
            const r = await createAgentTopic(owner!, `aurion:agent ${agent.name}`, msg, pass);
            saveAgent({ ...agent, owner: owner!, topicId: r.topicId, registeredHash: hash, registerTx: r.txId });
            return r.txId;
          }} done={(txId) => (
            <>
              <p className="font-semibold text-success">Agent ID sealed on Hedera</p>
              <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/transaction/${txId}`}>{txId}</a>
            </>
          )} />
        </div>
      )}
    </Panel>
  );
}

function AgentEditor({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [a, setA] = useState(agent);
  const [task, setTask] = useState("");
  const ok = a.name.trim() && a.instructions.trim();
  const perm = (k: keyof Agent["perms"], v: boolean | number) => setA({ ...a, perms: { ...a.perms, [k]: v } });
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between"><Label>{agent.name ? "Edit agent" : "New agent"}</Label><Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X /></Button></div>
      <div className="space-y-3">
        <input className="field" maxLength={40} placeholder="Name, like Budget Buddy" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
        <textarea className="field min-h-24 resize-none text-sm" maxLength={2000} placeholder="Its job. Example: Watch my spending each week and pay my sister's allowance every Friday." value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} />
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Quick tasks</p>
          <div className="mb-2 flex flex-wrap gap-2">{a.tasks.map((t) => <button key={t} type="button" onClick={() => setA({ ...a, tasks: a.tasks.filter((x) => x !== t) })} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">{t} <X size={10} /></button>)}</div>
          <div className="flex gap-2">
            <input className="field py-2 text-sm" maxLength={120} placeholder="Like: Summarize my week" value={task} onChange={(e) => setTask(e.target.value)} />
            <Button type="button" variant="outline" disabled={!task.trim() || a.tasks.length >= 8} onClick={() => { setA({ ...a, tasks: [...a.tasks, task.trim()] }); setTask(""); }}>Add</Button>
          </div>
        </div>
        <div className="card-surface space-y-2 p-3 text-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">What it may do</p>
          <label className="flex items-center justify-between gap-3">Read my balance and activity<input type="checkbox" checked={a.perms.readWallet} onChange={(e) => perm("readWallet", e.target.checked)} /></label>
          <label className="flex items-center justify-between gap-3">Prepare HBAR sends for me to sign<input type="checkbox" checked={a.perms.draftSends} onChange={(e) => perm("draftSends", e.target.checked)} /></label>
          {a.perms.draftSends && (
            <>
              <label className="flex items-center justify-between gap-3">Most per send (ℏ)<input className="field w-24 py-1 text-right tnum" inputMode="decimal" value={a.perms.maxPerSend} onChange={(e) => perm("maxPerSend", Math.max(0, Number(e.target.value) || 0))} /></label>
              <label className="flex items-center justify-between gap-3">Only pay saved contacts<input type="checkbox" checked={a.perms.contactsOnly} onChange={(e) => perm("contactsOnly", e.target.checked)} /></label>
            </>
          )}
          <p className="text-xs text-muted-foreground">Agents never hold your keys. You approve every send. Your Vault limits and screening still apply.</p>
        </div>
        {agent.registeredHash && <p className="text-xs text-muted-foreground">Changing the name, job or permissions pauses sends until you re-register on Hedera.</p>}
        <Button className="w-full" disabled={!ok} onClick={() => { saveAgent({ ...a, name: a.name.trim(), instructions: a.instructions.trim() }); onClose(); }}>Save agent</Button>
      </div>
    </Panel>
  );
}
