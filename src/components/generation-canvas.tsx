import { useReducedMotion } from "framer-motion";

/** Grok-style creation effect: living light field, grain and a scan line, then the image develops in. */
export function GenerationCanvas({ src, final, busy, alt }: { src: string | null; final: boolean; busy: boolean; alt: string }) {
  const reduce = useReducedMotion();
  const developing = busy || !final;
  return (
    <div className={`gen-canvas mt-4 ${developing && !reduce ? "gen-live" : ""}`} aria-busy={busy}>
      <div className="gen-field" aria-hidden />
      <div className="gen-grain" aria-hidden />
      {src && <img src={src} alt={alt} className={`gen-img ${final ? "gen-img-final" : ""}`} />}
      {developing && <div className="gen-scan" aria-hidden />}
      {developing && <p className="gen-label">{src ? "Refining…" : "Imagining…"}</p>}
    </div>
  );
}

/** Opens the share sheet (Save Image / Save to Photos on phones), else downloads. */
export async function saveToPhone(dataUrl: string, prompt: string) {
  const name = `aurion-${prompt.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "image"}.png`;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], name, { type: blob.type || "image/png" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "HashFolio Studio" }); return; }
  } catch (e) { if ((e as Error).name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
