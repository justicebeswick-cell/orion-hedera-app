// Turns files attached in AI Studio into message parts the AI can read.
// Images and PDFs go to the model as-is; text-like files (code, CSV, JSON, notes) are read as text.
import type { FileUIPart } from "ai";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|js|jsx|ts|tsx|py|rb|go|rs|java|kt|swift|c|h|cpp|cs|php|sh|sql|ya?ml|toml|ini|env|log|sol|rtf)$/i;

export function kindOf(f: { mediaType?: string; filename?: string }): "image" | "pdf" | "text" | null {
  const t = f.mediaType ?? "";
  if (t.startsWith("image/")) return "image";
  if (t === "application/pdf" || /\.pdf$/i.test(f.filename ?? "")) return "pdf";
  if (t.startsWith("text/") || /json|xml|javascript|csv|yaml|sql/.test(t) || TEXT_EXT.test(f.filename ?? "")) return "text";
  return null;
}

function dataUrlToText(url: string) {
  const b64 = url.split(",")[1] ?? "";
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export type StudioPart = { type: "text"; text: string } | FileUIPart;

/** Returns parts to send, plus names of files that could not be read. */
export function prepareFiles(files: FileUIPart[]): { parts: StudioPart[]; skipped: string[] } {
  const parts: StudioPart[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    const name = f.filename || "file";
    const k = kindOf(f);
    if (!k || !f.url?.startsWith("data:")) { skipped.push(name); continue; }
    if (k === "text") {
      parts.push({ type: "text", text: `Attached file "${name}":\n\`\`\`\n${dataUrlToText(f.url).slice(0, 200_000)}\n\`\`\`` });
    } else {
      parts.push({ type: "file", mediaType: k === "pdf" ? "application/pdf" : f.mediaType, filename: name, url: f.url });
    }
  }
  return { parts, skipped };
}
