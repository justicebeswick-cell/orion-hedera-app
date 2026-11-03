/**
 * Display preference: hide long decimal amounts.
 * Stored on this device only, never sent anywhere.
 */

const KEY = "aurion.display.round";
const EVENT = "aurion:round";

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function roundOn(): boolean {
  return store()?.getItem(KEY) === "1";
}

export function setRound(on: boolean) {
  const s = store();
  if (!s) return;
  if (on) s.setItem(KEY, "1");
  else s.removeItem(KEY);
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* no window */
  }
}

/**
 * Whole number when the setting is on, otherwise null.
 * Amounts under 1 keep their decimals so small rewards and fees never read as zero.
 */
export function whole(v: number): number | null {
  if (!roundOn() || !Number.isFinite(v) || Math.abs(v) < 1) return null;
  return Math.trunc(v);
}

/** Format an amount, dropping the decimals when the setting is on. */
export function fmtAmount(v: number, opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 8 }): string {
  const w = whole(v);
  return w === null
    ? v.toLocaleString("en-US", opts)
    : w.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Format a dollar amount, dropping the cents when the setting is on. */
export function fmtUsd(v: number): string {
  const w = whole(v);
  return w === null
    ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v < 1 ? 4 : 2 })
    : w.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
