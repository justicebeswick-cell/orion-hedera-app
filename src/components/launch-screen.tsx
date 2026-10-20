import { useEffect, useState } from "react";
import { HederaMark } from "@/components/hbar";
import launchLogo from "@/assets/aurion-logo-cardpurple.png.asset.json";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    const timer = window.setTimeout(() => setVisible(false), 2150);
    return () => { window.clearTimeout(fade); window.clearTimeout(timer); };
  }, []);
  if (!visible) return null;
  return (
    <div className={`launch-screen ${leaving ? "launch-leaving" : ""}`} role="status" aria-label="Opening AURION">
      <div className="launch-brand">
        <img src={launchLogo.url} alt="" width={1281} height={1304} fetchPriority="high" className="launch-logo" />
        <div className="launch-wordmark">
          <p className="text-3xl font-semibold tracking-wide">AURION</p>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <HederaMark size={16} /> Powered by Hedera
          </p>
        </div>
      </div>
    </div>
  );
}
