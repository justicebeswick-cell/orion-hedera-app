import { THEME_ICON_PALETTE } from "./theme-icon-palette";

/** Installed shortcuts need fetchable URLs, not document-lifetime blobs/data URLs. */
export function themeIconPaths(theme: string, target: [number, number, number]) {
  const exact = THEME_ICON_PALETTE.find((entry) => entry.name === theme);
  const distance = (rgb: [number, number, number]) => rgb.reduce((sum, value, i) => sum + (value - (target[i] ?? 0)) ** 2, 0);
  const nearest = THEME_ICON_PALETTE.reduce((best, entry) => distance(entry.rgb) < distance(best.rgb) ? entry : best);
  const name = exact?.name ?? nearest.name;
  const base = `/theme-icons/${theme === "default" ? "v36" : "v35"}/${name}`;
  return { manifest: `${base}.webmanifest`, apple: `${base}-180.png`, favicon: `${base}-64.png` };
}

function primaryRgb(): [number, number, number] | null {
  const probe = document.createElement("span");
  probe.style.color = "var(--primary)";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1).data;
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
}

function setLink(rel: string, href: string, type?: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
  if (type) element.type = type;
}

export function applyThemedIcon() {
  const target = primaryRgb();
  if (!target) return; // Keep the valid static fallback when canvas is unavailable.
  const paths = themeIconPaths(document.documentElement.dataset["theme"] ?? "dark", target);
  setLink("apple-touch-icon", paths.apple);
  setLink("icon", paths.favicon, "image/png");
  setLink("manifest", paths.manifest, "application/manifest+json");
}