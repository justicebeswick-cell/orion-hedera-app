import { useEffect, useState } from "react";
import { AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    const timer = window.setTimeout(() => setVisible(false), 2150);
    return () => { window.clearTimeout(fade); window.clearTimeout(timer); };
  }, []);
  if (!visible) return null;
  return <div className={`launch-screen ${leaving ? "launch-leaving" : ""}`} role="status" aria-label="Opening AURION"><div className="launch-brand"><AurionLogo className="h-44 w-44" /><p className="mt-2 text-xl font-semibold">AURION</p><p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><HbarLogo size={18} /> Powered by Hedera</p></div></div>;
}