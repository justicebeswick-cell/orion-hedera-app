import { afterEach, describe, expect, it } from "vitest";
import { lockOnClose, setLockOnClose, markUnlocked, needsUnlock, UNLOCKED } from "@/lib/lock";

const ACCOUNT = "aurion.account";
const KEYSTORE = "aurion.keystore";

afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("Lock when app closes", () => {
  it("is on by default and can be switched off", () => {
    expect(lockOnClose()).toBe(true);
    setLockOnClose(false);
    expect(lockOnClose()).toBe(false);
    setLockOnClose(true);
    expect(lockOnClose()).toBe(true);
  });

  it("locks a signed-in device-key wallet after the app was closed", () => {
    localStorage.setItem(ACCOUNT, "0.0.1234");
    localStorage.setItem(KEYSTORE, "{}");
    expect(needsUnlock()).toBe(true);
  });

  it("stays unlocked within the same session once unlocked", () => {
    localStorage.setItem(ACCOUNT, "0.0.1234");
    localStorage.setItem(KEYSTORE, "{}");
    markUnlocked();
    expect(needsUnlock()).toBe(false);
    // A new session (app fully closed) clears the flag and locks again.
    sessionStorage.removeItem(UNLOCKED);
    expect(needsUnlock()).toBe(true);
  });

  it("never locks when signed out or watch-only", () => {
    expect(needsUnlock()).toBe(false); // nobody signed in
    localStorage.setItem(ACCOUNT, "0.0.1234"); // watch-only: no key on device
    expect(needsUnlock()).toBe(false);
  });

  it("does not lock when the setting is off", () => {
    localStorage.setItem(ACCOUNT, "0.0.1234");
    localStorage.setItem(KEYSTORE, "{}");
    setLockOnClose(false);
    expect(needsUnlock()).toBe(false);
  });
});
