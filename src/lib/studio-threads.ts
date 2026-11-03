// AI Studio chats, saved in this browser only.
import type { UIMessage } from "ai";

export type Thread = { id: string; title: string; updatedAt: number; messages: UIMessage[]; agentId?: string | undefined };
const KEY = "aurion.studio.threads";
const IMG = "aurion.studio.images";

export function readThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export const getThread = (id: string) => readThreads().find((t) => t.id === id) ?? null;

export function saveThread(id: string, messages: UIMessage[], agentId?: string) {
  const all = readThreads();
  const firstText = messages.find((m) => m.role === "user")?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
  const title = (firstText?.text ?? "New chat").slice(0, 60);
  // Attached files are too big for browser storage: keep their names, drop their contents.
  const slim = messages.map((m) => ({ ...m, parts: m.parts.map((p) => (p.type === "file" ? { type: "text" as const, text: `📎 ${(p as { filename?: string }).filename ?? "Attachment"} (not saved)` } : p.type === "text" && p.text.startsWith("Attached file \"") ? { ...p, text: `📎 ${p.text.slice(15, p.text.indexOf("\":"))} (not saved)` } : p)) }));
  const t: Thread = { id, title, updatedAt: Date.now(), messages: slim as UIMessage[], agentId };
  const next = [t, ...all.filter((x) => x.id !== id)].slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full: keep chatting, skip saving */ }
}
export function deleteThread(id: string) {
  localStorage.setItem(KEY, JSON.stringify(readThreads().filter((t) => t.id !== id)));
}

export type SavedImage = { id: string; prompt: string; url: string; at: number };
export function readImages(): SavedImage[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(IMG) ?? "[]"); } catch { return []; }
}
export function saveImage(img: SavedImage) {
  let list = [img, ...readImages()].slice(0, 12);
  // Images are large; drop the oldest until it fits.
  while (list.length) {
    try { localStorage.setItem(IMG, JSON.stringify(list)); return; } catch { list = list.slice(0, -1); }
  }
}

export function clearStudio() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(IMG);
}
