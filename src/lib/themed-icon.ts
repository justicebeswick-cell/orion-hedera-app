// Browser-only: recolors the Orion app icon to the active theme color and points
// the home-screen icon tags at it. Phones copy the icon at install time, so a new
// color shows after the app is re-added to the home screen.

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

/** Recolor saturated pixels to the target hue/saturation, keeping their lightness. */
export function recolorPixels(data: Uint8ClampedArray, target: [number, number, number]) {
  const [th, ts] = rgbToHsl(...target);
  for (let i = 0; i < data.length; i += 4) {
    const [, s, l] = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!);
    if (s < 0.2 || l < 0.04) continue;
    const [r, g, b] = hslToRgb(th, Math.min(1, ts * (s / 0.8)), l);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
}

function primaryRgb(): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = "var(--primary)";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!];
}

let source: Promise<HTMLImageElement> | null = null;
function loadSource() {
  source ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img); img.onerror = reject;
    img.src = "/icon-512-v34.png";
  });
  return source;
}

function setLink(rel: string, href: string, type?: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  el.href = href; if (type) el.type = type;
}

let manifestUrl: string | null = null;

export async function applyThemedIcon() {
  const img = await loadSource();
  const target = primaryRgb();
  const big = document.createElement("canvas"); big.width = big.height = 512;
  const ctx = big.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 512, 512);
  const pixels = ctx.getImageData(0, 0, 512, 512);
  recolorPixels(pixels.data, target);
  ctx.putImageData(pixels, 0, 0);
  const sized = (n: number) => { const c = document.createElement("canvas"); c.width = c.height = n; c.getContext("2d")!.drawImage(big, 0, 0, n, n); return c.toDataURL("image/png"); };
  const icon512 = big.toDataURL("image/png"), icon192 = sized(192);
  setLink("apple-touch-icon", sized(180));
  setLink("icon", sized(64), "image/png");
  const origin = location.origin;
  const manifest = {
    id: "/?app=aurion", name: "Orion — A Hashgraph Wallet", short_name: "Orion",
    description: "A Hashgraph Wallet. Store, send, swap and stake on Hedera.",
    start_url: `${origin}/`, scope: `${origin}/`, display: "standalone", background_color: "#000000", theme_color: "#000000",
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
  setLink("manifest", manifestUrl);
}
