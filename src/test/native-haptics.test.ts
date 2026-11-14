import { afterEach, beforeEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ platform: true, impact: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.platform, getPlatform: () => "ios" },
  registerPlugin: () => ({}),
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: native.impact },
  ImpactStyle: { Light: "LIGHT" },
}));

import { handleHapticClick, tapHaptic } from "@/lib/haptics";
import { savePreferences } from "@/lib/preferences";

beforeEach(() => {
  localStorage.clear();
  native.platform = true;
  native.impact.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });

// Trusted input is browser-owned; supply only the event fields the listener reads.
function tap(target: Element, isTrusted = true) {
  handleHapticClick({ target, isTrusted } as unknown as MouseEvent);
}

it("uses one light Capacitor impact for a navigation tab tap", async () => {
  const tab = document.createElement("a");
  tab.href = "/vault";
  const icon = document.createElement("span");
  tab.append(icon); document.body.append(tab);
  tap(icon);
  await vi.waitFor(() => expect(native.impact).toHaveBeenCalledExactlyOnceWith({ style: "LIGHT" }));
});

it("uses one light Capacitor impact when tapping to copy a Hedera address", async () => {
  const copy = document.createElement("button");
  copy.onclick = vi.fn(); document.body.append(copy);
  tap(copy);
  await vi.waitFor(() => expect(native.impact).toHaveBeenCalledExactlyOnceWith({ style: "LIGHT" }));
});

it("uses one light Capacitor impact when tapping a transaction confirmation", async () => {
  const confirm = document.createElement("button");
  document.body.append(confirm);
  tap(confirm);
  await vi.waitFor(() => expect(native.impact).toHaveBeenCalledExactlyOnceWith({ style: "LIGHT" }));
});

it("respects disabled haptics on native iOS", async () => {
  savePreferences({ haptics: false });
  tapHaptic();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(native.impact).not.toHaveBeenCalled();
});

it("does not vibrate for disabled or inert controls or synthetic clicks", async () => {
  const button = document.createElement("button");
  button.disabled = true; tap(button);
  button.disabled = false; tap(button, false);
  const container = document.createElement("div");
  container.setAttribute("inert", ""); container.append(button); tap(button);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(native.impact).not.toHaveBeenCalled();
});

it("keeps native plugin failures from interrupting a tap", async () => {
  native.impact.mockRejectedValueOnce(new Error("Haptics unavailable"));
  expect(() => tapHaptic()).not.toThrow();
  await vi.waitFor(() => expect(native.impact).toHaveBeenCalledOnce());
});

it("uses browser vibration instead of Capacitor outside the native wrapper", () => {
  native.platform = false;
  const vibrate = vi.fn(); vi.stubGlobal("navigator", { vibrate });
  tapHaptic();
  expect(vibrate).toHaveBeenCalledExactlyOnceWith(10);
  expect(native.impact).not.toHaveBeenCalled();
});