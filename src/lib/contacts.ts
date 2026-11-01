// Address book. Lives only in this browser (localStorage), like the rest of HashKey's wallet data.
import { useEffect, useState } from "react";

export type Contact = { id: string; name: string; account: string; note?: string | undefined };
const KEY = "aurion.contacts";
const EVT = "aurion-contacts";

export function readContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(list: Contact[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}
export function saveContact(c: Omit<Contact, "id"> & { id?: string | undefined }) {
  const list = readContacts();
  const id = c.id ?? crypto.randomUUID();
  const next = { id, name: c.name.trim().slice(0, 40), account: c.account.trim(), note: c.note?.trim().slice(0, 80) || undefined };
  write(list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? next : x)) : [...list, next].sort((a, b) => a.name.localeCompare(b.name)));
}
export function removeContact(id: string) { write(readContacts().filter((c) => c.id !== id)); }
export const contactFor = (account: string) => readContacts().find((c) => c.account === account.trim());

export function useContacts() {
  const [list, setList] = useState<Contact[]>([]);
  useEffect(() => {
    const load = () => setList(readContacts());
    load();
    window.addEventListener(EVT, load); window.addEventListener("storage", load);
    return () => { window.removeEventListener(EVT, load); window.removeEventListener("storage", load); };
  }, []);
  return list;
}
