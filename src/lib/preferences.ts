import { useEffect, useState } from "react";
import { z } from "zod";

export const DEFAULT_PREFERENCES = { currency: "USD", systemFormat: false, showWorth: true, showPrices: true, showReserve: false, autoTheme: false, theme: "dark", hideSpam: false, hideFees: false, haptics: true };
export type Preferences = typeof DEFAULT_PREFERENCES;
const KEY = "aurion.general";
const EVENT = "aurion:general";
const schema = z.object({ currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]), systemFormat: z.boolean(), showWorth: z.boolean(), showPrices: z.boolean(), showReserve: z.boolean(), autoTheme: z.boolean(), theme: z.enum(["default", "dark", "moonlight", "royal"]), hideSpam: z.boolean(), hideFees: z.boolean(), haptics: z.boolean() });
export function getPreferences(): Preferences {
  try { return schema.parse({ ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }); } catch { return { ...DEFAULT_PREFERENCES }; }
}
export function savePreferences(patch: Partial<Preferences>) {
  const next = schema.parse({ ...getPreferences(), ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); } catch { /* Storage may be unavailable. */ }
}
export function usePreferences() {
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFERENCES });
  useEffect(() => { const update = () => setPrefs(getPreferences()); update(); window.addEventListener(EVENT, update); window.addEventListener("storage", update); window.addEventListener("aurion:round", update); return () => { window.removeEventListener(EVENT, update); window.removeEventListener("storage", update); window.removeEventListener("aurion:round", update); }; }, []);
  return prefs;
}
export function resolvedTheme(prefs: Preferences, light: boolean) { return prefs.autoTheme ? light ? "default" : "dark" : prefs.theme; }
export function showAuditEvent(action: string, prefs: Preferences) { return !(prefs.hideFees && action === "swap fee"); }