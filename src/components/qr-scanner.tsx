import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { parseQrRecipient } from "@/lib/recipient";
import { Button } from "@/components/ui/button";

/** Pull a Hedera account ID (0.0.x) out of a scanned QR payload, e.g. "hedera:0.0.123" or a HashScan URL. */
export function parseAccountFromQr(text: string, allowEvm = false): string | null {
  return parseQrRecipient(text, allowEvm);
}

/** Full-screen camera scanner. Calls onResult with the account ID found. */
export function QrScanner({ onResult, onClose, allowEvm = false, raw = false }: { onResult: (account: string) => void; onClose: () => void; allowEvm?: boolean; raw?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const cb = useRef(onResult); cb.current = onResult;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    (async () => {
      try {
        const jsQR = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = video.current;
        if (!v || stopped) return;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (stopped) return;
          if (v.readyState >= 2 && ctx && v.videoWidth) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code?.data) {
              const acct = raw ? code.data : parseAccountFromQr(code.data, allowEvm);
              if (acct) { cb.current(acct); return; }
              setErr(allowEvm ? "That QR code has no Hedera account ID or 0x address." : "That QR code has no Hedera account ID.");
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr(!window.isSecureContext || !navigator.mediaDevices ? "Camera needs the installed app or a secure page." : window.self !== window.top ? "Camera is blocked in the editor preview. Open the published app to scan." : "Camera blocked. Allow camera access for this site in your browser settings.");
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [allowEvm]);

  return createPortal(
    <div className="app-safe-screen fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur">
      <Button type="button" variant="ghost" size="icon" aria-label="Close scanner" onClick={onClose} className="absolute right-[calc(1rem+var(--safe-right))] top-[calc(1rem+var(--safe-top))] text-muted-foreground"><X size={22} /></Button>
      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-primary/60">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary/80" />
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground">{err || "Point at a Hedera account QR code."}</p>
    </div>,
    document.body,
  );
}
