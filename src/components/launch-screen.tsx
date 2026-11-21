import { useEffect, useState } from "react";
import { HederaMark } from "@/components/hbar";
import { AurionLogo } from "@/components/aurion";
import { OrionName } from "@/components/orion-name";
import lettering from "@/assets/orion-lettering-complete.png";
import { prepareLaunchAssets, runLaunchTimeline } from "@/lib/launch";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setVisible(true); setLeaving(false); setReady(false); setGeneration((value) => value + 1);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let stopTimeline: (() => void) | undefined;
    const syncVisibility = () => setPaused(document.visibilityState === "hidden");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    prepareLaunchAssets(["/orion-refined/launch-sphere-v39.png", lettering], controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setReady(true);
      stopTimeline = runLaunchTimeline(() => setLeaving(true), () => setVisible(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    });
    return () => { controller.abort(); stopTimeline?.(); document.removeEventListener("visibilitychange", syncVisibility); };
  }, [generation]);
  if (!visible) return null;
  return (
    <div className={`launch-screen ${ready ? "launch-ready" : ""} ${paused ? "launch-paused" : ""} ${leaving ? "launch-leaving" : ""}`} role="status" aria-label="Opening Orion">
      <div key={generation} className="launch-brand">
        <div className="launch-logo relative" role="img" aria-label="Orion logo">
          <AurionLogo className="h-full w-full" sizes="148px" orbit />
        </div>
        <div className="launch-wordmark">
          <div className="launch-name"><OrionName className="mx-auto w-32" /></div>
          <div className="launch-rule" />
          <p className="launch-tag flex items-center justify-center gap-2 text-muted-foreground">
            <HederaMark size={13} /> Powered by Hedera
          </p>
        </div>
      </div>
    </div>
  );
}
