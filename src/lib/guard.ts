import { MIRROR } from "./hedera";

/** Send limits, recipient screening and the local audit log. All device-side. */

export type Limits = { perSend: number; perDay: number };
const LIMITS = "aurion.limits";
const AUDIT = "aurion.audit";
const BLOCK = "aurion.blocklist";
export const DEFAULT_LIMITS: Limits = { perSend: 1000, perDay: 5000 };

export function getLimits(): Limits {
  try { return { ...DEFAULT_LIMITS, ...JSON.parse(localStorage.getItem(LIMITS) ?? "{}") }; } catch { return DEFAULT_LIMITS; }
}
export function setLimits(l: Limits) {
  localStorage.setItem(LIMITS, JSON.stringify(l));
  audit({ action: "limits", detail: `Per send ${l.perSend} ℏ · per day ${l.perDay} ℏ`, ok: true });
}

export type AuditEntry = { at: string; action: string; detail: string; ok: boolean; txId?: string };
export function readAudit(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT) ?? "[]"); } catch { return []; }
}
export function audit(e: Omit<AuditEntry, "at">) {
  const all = [{ at: new Date().toISOString(), ...e }, ...readAudit()].slice(0, 200);
  localStorage.setItem(AUDIT, JSON.stringify(all));
}

/** Your own blocklist, on top of the built-in screen. */
export function readBlocklist(): string[] {
  try { return JSON.parse(localStorage.getItem(BLOCK) ?? "[]"); } catch { return []; }
}
export function setBlocklist(ids: string[]) { localStorage.setItem(BLOCK, JSON.stringify(ids)); }

/** Hedera accounts flagged publicly. Extend as screening sources are added. */
const SCREEN_LIST = new Set<string>([]);

function sentToday(from: string): number {
  const since = Date.now() - 86_400_000;
  return readAudit()
    .filter((a) => a.action === "send" && a.ok && new Date(a.at).getTime() > since && a.detail.startsWith(from))
    .reduce((s, a) => s + Number(a.detail.match(/ ([\d.]+) ℏ/)?.[1] ?? 0), 0);
}

/** Returns null when the send may go, or a reason naming the failing check. */
export async function checkSend(from: string, to: string, amount: number): Promise<string | null> {
  const l = getLimits();
  if (to === from) return "Recipient check: cannot send to yourself.";
  if (amount > l.perSend) return `Send limit: ${amount} ℏ is over your ${l.perSend} ℏ per-send cap.`;
  const today = sentToday(from);
  if (today + amount > l.perDay) return `Daily limit: ${today} ℏ already sent today, cap is ${l.perDay} ℏ.`;
  if (SCREEN_LIST.has(to) || readBlocklist().includes(to)) return `Screening: ${to} is on the blocked list.`;
  const r = await fetch(`${MIRROR}/api/v1/accounts/${to}?limit=1`).catch(() => null);
  if (!r) return "Hedera unreachable";
  if (r.status === 404) return `Recipient check: ${to} does not exist on mainnet.`;
  const a = await r.json();
  if (a.deleted) return `Recipient check: ${to} is deleted.`;
  if (a.receiver_sig_required) return `Recipient check: ${to} must co-sign incoming transfers. Not supported.`;
  return null;
}
