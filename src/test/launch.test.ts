import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareLaunchAssets, runLaunchTimeline } from "@/lib/launch";

describe("Startup readiness and visible playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("waits for both sphere and wording decoding before playback", async () => {
    const images: { onload?: () => void; onerror?: () => void; decode: () => Promise<void>; src: string }[] = [];
    vi.stubGlobal("Image", class {
      src = "";
      onload?: () => void;
      onerror?: () => void;
      decode = () => Promise.resolve();
      constructor() { images.push(this); }
    });
    const ready = vi.fn();
    const promise = prepareLaunchAssets(["sphere.png", "wording.png"], new AbortController().signal).then(ready);
    images[0]?.onload?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).not.toHaveBeenCalled();
    images[1]?.onload?.();
    await promise;
    expect(ready).toHaveBeenCalledOnce();
  });

  it("does not trap startup when an image never responds", async () => {
    vi.stubGlobal("Image", class { src = ""; });
    const ready = vi.fn();
    const promise = prepareLaunchAssets(["offline.png"], new AbortController().signal).then(ready);
    await vi.advanceTimersByTimeAsync(4000);
    await promise;
    expect(ready).toHaveBeenCalledOnce();
  });

  it("does not consume the animation while the phone is backgrounded", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const fade = vi.fn();
    const done = vi.fn();
    const stop = runLaunchTimeline(fade, done, false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fade).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(2200);
    expect(fade).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(fade).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(650);
    expect(done).toHaveBeenCalledOnce();
    stop();
  });

  it("uses a shorter presentation when reduced motion is selected", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const done = vi.fn();
    const stop = runLaunchTimeline(vi.fn(), done, true);
    await vi.advanceTimersByTimeAsync(650);
    expect(done).toHaveBeenCalledOnce();
    stop();
  });
});