import { useEffect } from "react";
import { usePreferences, resolvedTheme, resolveDock } from "@/lib/preferences";
import { setCurrencyRates } from "@/lib/display-currency";
import { applyThemedIcon } from "@/lib/themed-icon";

export function GeneralPreferences() {
  const prefs = usePreferences();
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      document.documentElement.style.setProperty("--custom-color", prefs.customColor);
      document.documentElement.dataset["theme"] = resolvedTheme(prefs, media.matches);
      applyThemedIcon();
      // Safari fills the iPhone Duo side strip and status areas with theme-color; match the page exactly.
      const bg = toHex(getComputedStyle(document.body).backgroundColor);
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", bg));
    };
    update();
    media.addEventListener("change", update); return () => { media.removeEventListener("change", update); };
  }, [prefs.theme, prefs.autoTheme, prefs.customColor]);
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
    document.body.appendChild(probe);
    const update = () => {
      const style = getComputedStyle(probe);
      document.documentElement.dataset["dock"] = resolveDock(prefs.dock, window.innerWidth, parseFloat(style.paddingLeft) || 0, parseFloat(style.paddingRight) || 0);
    };
    update();
    window.addEventListener("resize", update); window.visualViewport?.addEventListener("resize", update);
    return () => { window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); probe.remove(); };
  }, [prefs.dock]);
  useEffect(() => {
    const controller = new AbortController();
    if (prefs.currency === "USD") return;
    fetch("https://api.frankfurter.app/latest?from=USD", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Currency unavailable"); return response.json(); }).then((data) => { setCurrencyRates(data.rates); window.dispatchEvent(new Event("aurion:round")); }).catch(() => {});
    return () => controller.abort();
  }, [prefs.currency]);
  return null;
}
/** Normalise any CSS colour (e.g. oklch) to #rrggbb, which every browser accepts for theme-color. */
function toHex(color: string) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#000000";
  ctx.fillStyle = "#000"; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
