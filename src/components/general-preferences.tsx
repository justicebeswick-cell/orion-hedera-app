import { useEffect } from "react";
import { usePreferences, resolvedTheme } from "@/lib/preferences";
import { setCurrencyRates } from "@/lib/display-currency";

export function GeneralPreferences() {
  const prefs = usePreferences();
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      document.documentElement.style.setProperty("--custom-color", prefs.customColor);
      document.documentElement.dataset["theme"] = resolvedTheme(prefs, media.matches);
    };
    update();
    const iconTimer = window.setTimeout(() => { import("@/lib/themed-icon").then((m) => m.applyThemedIcon()).catch(() => {}); }, 300);
    media.addEventListener("change", update); return () => { window.clearTimeout(iconTimer); media.removeEventListener("change", update); };
  }, [prefs.theme, prefs.autoTheme, prefs.customColor]);
  useEffect(() => {
    const controller = new AbortController();
    if (prefs.currency === "USD") return;
    fetch("https://api.frankfurter.app/latest?from=USD", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Currency unavailable"); return response.json(); }).then((data) => { setCurrencyRates(data.rates); window.dispatchEvent(new Event("aurion:round")); }).catch(() => {});
    return () => controller.abort();
  }, [prefs.currency]);
  return null;
}