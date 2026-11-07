import { useEffect, useState } from "react";
import { z } from "zod";
const KEY = "aurion.security.preferences";
const schema = z.object({ autoLock: z.union([z.literal(0), z.literal(1), z.literal(5), z.literal(15)]), hideBalance: z.boolean() });
export type SecurityPreferences = z.infer<typeof schema>;
export const SECURITY_DEFAULTS: SecurityPreferences = { autoLock: 0, hideBalance: false };
export function getSecurityPreferences() { try { return schema.parse({ ...SECURITY_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }); } catch { return { ...SECURITY_DEFAULTS }; } }
export function saveSecurityPreferences(patch: Partial<SecurityPreferences>) { localStorage.setItem(KEY, JSON.stringify(schema.parse({ ...getSecurityPreferences(), ...patch }))); window.dispatchEvent(new Event("aurion:security")); }
export function useSecurityPreferences() {
  const [prefs, setPrefs] = useState(SECURITY_DEFAULTS);
  useEffect(() => { const update = () => setPrefs(getSecurityPreferences()); update(); window.addEventListener("aurion:security", update); window.addEventListener("storage", update); return () => { window.removeEventListener("aurion:security", update); window.removeEventListener("storage", update); }; }, []);
  return prefs;
}