// App lock: when the app is fully closed, the next open asks for Face ID or the
// device passphrase before the wallet shows. Minimizing or switching apps does NOT
// lock — the session flag lives in sessionStorage, which only dies with the process.
// Self-contained on purpose: no imports, so keystore.ts can mark unlocks without a cycle.

const LOCK = "aurion.lockOnClose";
export const UNLOCKED = "aurion.unlocked";

/** Default on: the owner asked for a lock on reopen. */
export function lockOnClose(): boolean {
  return localStorage.getItem(LOCK) !== "0";
}
export function setLockOnClose(v: boolean) {
  localStorage.setItem(LOCK, v ? "1" : "0");
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED, "1");
}

/** True when the wallet should stay hidden until the owner proves it's them. */
export function needsUnlock(): boolean {
  if (!lockOnClose()) return false;
  if (!localStorage.getItem("aurion.account")) return false; // nobody signed in
  if (!localStorage.getItem("aurion.keystore")) return false; // watch-only: no passphrase to check
  return sessionStorage.getItem(UNLOCKED) !== "1";
}
