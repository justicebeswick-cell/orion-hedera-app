/** Optional browser haptics; unsupported devices remain fully functional. */
import { getPreferences } from "./preferences";
export function tapHaptic() {
  if (!getPreferences().haptics) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(10); } catch { /* Some browsers disallow vibration. */ }
}

export function handleHapticClick(event: MouseEvent) {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  const control = event.target.closest('button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"]');
  if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
  tapHaptic();
}