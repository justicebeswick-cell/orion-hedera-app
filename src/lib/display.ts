/**
 * Display preference: hide long decimal amounts.
 * Stored on this device only, never sent anywhere.
 */

import { getPreferences } from "./preferences";
import { convertUsd } from "./display-currency";
import { getSecurityPreferences } from "./security-preferences";
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
  if (getSecurityPreferences().hideBalance) return "••••";
  const w = whole(v);
  return w === null
    ? v.toLocaleString("en-US", opts)
    : w.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Format a dollar amount, dropping the cents when the setting is on. */
export function fmtUsd(v: number): string {
  if (getSecurityPreferences().hideBalance) return "••••";
  const prefs = getPreferences();
  const converted = convertUsd(v, prefs.currency);
  if (converted === null) return `${prefs.currency} —`;
  v = converted;
  const locale = prefs.systemFormat && typeof navigator !== "undefined" ? navigator.language : "en-US";
  const w = whole(v);
  return w === null
    ? v.toLocaleString(locale, { style: "currency", currency: prefs.currency, maximumFractionDigits: prefs.currency === "JPY" ? 0 : v < 1 ? 4 : 2 })
    : w.toLocaleString(locale, { style: "currency", currency: prefs.currency, maximumFractionDigits: 0 });
}

/**
 * Format a dollar amount as its big figures plus a smaller cents part, so a
 * portfolio balance can lead with the whole number. Honours the same settings
 * as fmtUsd: hidden balances, the chosen currency and hide-decimals.
 */
export function fmtUsdParts(v: number): { main: string; frac: string } {
  if (getSecurityPreferences().hideBalance) return { main: "••••", frac: "" };
  const prefs = getPreferences();
  const converted = convertUsd(v, prefs.currency);
  if (converted === null) return { main: `${prefs.currency} —`, frac: "" };
  const locale = prefs.systemFormat && typeof navigator !== "undefined" ? navigator.language : "en-US";
  const w = whole(converted);
  const main = (w ?? Math.trunc(converted)).toLocaleString(locale, { style: "currency", currency: prefs.currency, maximumFractionDigits: 0 });
  const digits = prefs.currency === "JPY" ? 0 : converted < 1 ? 4 : 2;
  if (w !== null || digits === 0) return { main, frac: "" };
  const frac = (converted - Math.trunc(converted)).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return { main, frac: frac.replace(/^0(?=[.,])/, "") };
}
