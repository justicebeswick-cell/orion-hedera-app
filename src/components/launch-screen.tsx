import { useEffect, useState } from "react";
import { HederaMark } from "@/components/hbar";
import { AurionLogo } from "@/components/aurion";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 2300);
    const timer = window.setTimeout(() => setVisible(false), 2900);
    return () => { window.clearTimeout(fade); window.clearTimeout(timer); };
  }, []);
  if (!visible) return null;
  return (
    <div className={`launch-screen ${leaving ? "launch-leaving" : ""}`} role="status" aria-label="Opening HashKey">
      <div className="launch-brand">
        <AurionLogo className="launch-logo" />
        <div className="launch-wordmark">
          <p className="launch-name">HashKey</p>
          <div className="launch-rule" />
          <p className="launch-tag flex items-center justify-center gap-2 text-muted-foreground">
            <HederaMark size={13} /> Powered by Hedera
          </p>
        </div>
      </div>
    </div>
  );
}
