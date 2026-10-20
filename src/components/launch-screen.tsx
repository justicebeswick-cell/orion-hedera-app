import { useEffect, useState } from "react";
import { HederaMark } from "@/components/hbar";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    const timer = window.setTimeout(() => setVisible(false), 2150);
    return () => { window.clearTimeout(fade); window.clearTimeout(timer); };
  }, []);
  if (!visible) return null;
  return <div className={`launch-screen ${leaving ? "launch-leaving" : ""}`} role="status" aria-label="Opening AURION"><div className="launch-brand"><p className="text-3xl font-semibold tracking-wide">AURION</p><p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><HederaMark size={18} /> Powered by Hedera</p></div></div>;
}