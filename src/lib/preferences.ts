import { useEffect, useState } from "react";
import { z } from "zod";

export const THEME_OPTIONS = [
  { id: "default", label: "Default" }, { id: "dark", label: "Dark" },
  { id: "moonlight", label: "Moonlight" }, { id: "royal", label: "Royal" },
  { id: "amethyst", label: "Amethyst" }, { id: "lavender", label: "Lavender" },
  { id: "plum", label: "Plum" }, { id: "blue", label: "Blue" },
  { id: "custom", label: "Custom" },
] as const;
export const DEFAULT_PREFERENCES = { currency: "USD", systemFormat: false, showWorth: true, showPrices: true, showReserve: false, autoTheme: false, theme: "dark", customColor: "#7a3fd6", hideSpam: false, hideFees: false, haptics: true, dock: "auto" as "auto" | "bottom" | "side" };
export type Preferences = typeof DEFAULT_PREFERENCES;
const KEY = "aurion.general";
const EVENT = "aurion:general";
const schema = z.object({ currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]), systemFormat: z.boolean(), showWorth: z.boolean(), showPrices: z.boolean(), showReserve: z.boolean(), autoTheme: z.boolean(), theme: z.enum(THEME_OPTIONS.map((option) => option.id)), customColor: z.string().regex(/^#[0-9a-f]{6}$/i), hideSpam: z.boolean(), hideFees: z.boolean(), haptics: z.boolean(), dock: z.enum(["auto", "bottom", "side"]) });
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
/** Side rail wins when chosen, or on "auto" when a narrow screen reports a large right-only inset (iPhone Duo outer display). */
export function resolveDock(choice: Preferences["dock"], width: number, insetLeft: number, insetRight: number): "bottom" | "side" {
  if (choice !== "auto") return choice;
  return width <= 440 && insetRight >= 20 && insetRight - insetLeft >= 12 ? "side" : "bottom";
}
