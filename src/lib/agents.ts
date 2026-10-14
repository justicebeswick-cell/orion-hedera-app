// AI agents: saved on this device; identity and activity anchored on Hedera (HCS topic per agent).
import { useEffect, useState } from "react";
import { sha256Hex } from "@/lib/hedera";

export type AgentPerms = { readWallet: boolean; draftSends: boolean; maxPerSend: number; contactsOnly: boolean };
export type Agent = {
  id: string; name: string; instructions: string; tasks: string[]; perms: AgentPerms; createdAt: number;
  owner?: string | undefined; topicId?: string | undefined; registeredHash?: string | undefined; registerTx?: string | undefined;
};
const KEY = "aurion.agents";
const EVT = "aurion-agents";

export const DEFAULT_PERMS: AgentPerms = { readWallet: true, draftSends: false, maxPerSend: 10, contactsOnly: true };

export function readAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export const getAgent = (id: string) => readAgents().find((a) => a.id === id) ?? null;
export function saveAgent(a: Agent) {
  const all = readAgents();
  localStorage.setItem(KEY, JSON.stringify(all.some((x) => x.id === a.id) ? all.map((x) => (x.id === a.id ? a : x)) : [a, ...all]));
  window.dispatchEvent(new Event(EVT));
}
export function deleteAgent(id: string) {
  localStorage.setItem(KEY, JSON.stringify(readAgents().filter((a) => a.id !== id)));
  window.dispatchEvent(new Event(EVT));
}
export function useAgents() {
  const [list, setList] = useState<Agent[]>([]);
  useEffect(() => {
    const load = () => setList(readAgents());
    load(); window.addEventListener(EVT, load);
    return () => window.removeEventListener(EVT, load);
  }, []);
  return list;
}

/** Fingerprint of everything that controls what the agent may do. */
export const agentHash = (a: Pick<Agent, "name" | "instructions" | "perms">) =>
  sha256Hex(JSON.stringify({ name: a.name, instructions: a.instructions, perms: a.perms }));

export type AgentStatus = "unregistered" | "verified" | "changed";
export async function agentStatus(a: Agent): Promise<AgentStatus> {
  if (!a.topicId || !a.registeredHash) return "unregistered";
  return (await agentHash(a)) === a.registeredHash ? "verified" : "changed";
}

/** The registration record written to the agent's topic. */
export const registrationMessage = (a: Agent, owner: string, hash: string) => JSON.stringify({
  p: "aurion-agent", v: 1, op: "register", name: a.name, owner, config_sha256: hash, perms: a.perms, at: new Date().toISOString(),
});
export const actionMessage = (op: string, data: Record<string, unknown>, hash: string) =>
  JSON.stringify({ p: "aurion-agent", v: 1, op, config_sha256: hash, ...data, at: new Date().toISOString() });
