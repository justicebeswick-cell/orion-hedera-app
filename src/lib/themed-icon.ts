/** Installed shortcuts need fetchable URLs, not document-lifetime blobs/data URLs. */
export function themeIconPaths(_theme: string, _target: [number, number, number]) {
  return { manifest: "/orion-refined/manifest-v47.webmanifest", apple: "/theme-icons/v47/default-180.png", favicon: "/theme-icons/v47/default-64.png" };
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