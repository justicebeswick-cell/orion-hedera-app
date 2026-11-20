/** Decode every logo layer before starting its animation, without trapping startup offline. */
export function prepareLaunchAssets(urls: string[], signal: AbortSignal, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const images: HTMLImageElement[] = [];
    let remaining = urls.length;
    const finish = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      images.forEach((image) => { image.onload = null; image.onerror = null; });
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted || remaining === 0) { finish(); return; }
    urls.forEach((url) => {
      const image = new Image();
      images.push(image);
      const settled = () => { remaining -= 1; if (remaining === 0) finish(); };
      image.onload = () => { image.decode().catch(() => {}).then(settled); };
      image.onerror = settled;
      image.src = url;
    });
  });
}

/** Background time never consumes the visible single-orbit presentation. */
export function runLaunchTimeline(onFade: () => void, onComplete: () => void, reducedMotion: boolean) {
  const hold = reducedMotion ? 450 : 2300;
  const fade = reducedMotion ? 150 : 600;
  let elapsed = 0;
  let previous: number | undefined;
  let fading = false;
  let frame = 0;
  const resetClock = () => { previous = undefined; };
  const tick = (now: number) => {
    if (document.visibilityState !== "hidden") {
      if (previous !== undefined) elapsed += now - previous;
      previous = now;
      if (!fading && elapsed >= hold) { fading = true; onFade(); }
      if (elapsed >= hold + fade) { document.removeEventListener("visibilitychange", resetClock); onComplete(); return; }
    } else previous = undefined;
    frame = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", resetClock);
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", resetClock); };
}