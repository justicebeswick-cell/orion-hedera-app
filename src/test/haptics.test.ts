import { afterEach, expect, it, vi } from "vitest";
import { tapHaptic } from "@/lib/haptics";

afterEach(() => vi.unstubAllGlobals());

it("provides a light ten millisecond vibration when supported", () => {
  const vibrate = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  tapHaptic();
  expect(vibrate).toHaveBeenCalledWith(10);
});

it("does not interrupt controls when vibration is unsupported or blocked", () => {
  vi.stubGlobal("navigator", {});
  expect(() => tapHaptic()).not.toThrow();
  vi.stubGlobal("navigator", { vibrate: () => { throw new Error("Blocked"); } });
  expect(() => tapHaptic()).not.toThrow();
});