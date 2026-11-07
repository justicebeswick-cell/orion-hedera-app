import { describe, expect, it, beforeEach, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { checkDeviceCode } from "@/lib/passphrase";
import { changeDeviceCode, saveKeystore, unlockKeystore, readKeystoreMeta, activateSavedAccount } from "@/lib/keystore";

describe("Orion device codes", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); });
  it("accepts a four-digit code", () => { expect(checkDeviceCode("4829").ok).toBe(true); });
  it("accepts a six-digit code", () => { expect(checkDeviceCode("482917").ok).toBe(true); });
  it("accepts an eight-digit code", () => { expect(checkDeviceCode("48291736").ok).toBe(true); });
  it("refuses other lengths and passwords as new codes", () => { for (const value of ["482", "48291", "4829173", "4829173650", "Purple-Tiger-42"]) expect(checkDeviceCode(value).ok).toBe(false); });
  it("refuses obviously guessable codes", () => { for (const value of ["1234", "0000", "2580", "1990", "121212", "12345678"]) expect(checkDeviceCode(value).ok).toBe(false); });
  it("rotates the existing wallet and its saved copy without changing its private key", async () => {
    await saveKeystore("test-key-not-funded", "Purple-Tiger-42", { publicKey: "test-public", evm: "test-evm", accountId: "0.0.123" });
    localStorage.setItem("aurion.bio", "old-seal");
    await changeDeviceCode("Purple-Tiger-42", "482917");
    expect(await unlockKeystore("482917")).toBe("test-key-not-funded");
    await expect(unlockKeystore("Purple-Tiger-42")).rejects.toThrow("Wrong passphrase");
    expect(readKeystoreMeta()).toMatchObject({ accountId: "0.0.123", publicKey: "test-public", codeLength: 6 });
    expect(localStorage.getItem("aurion.bio")).toBeNull();
    expect(activateSavedAccount("0.0.123")).toBe(true);
    expect(await unlockKeystore("482917")).toBe("test-key-not-funded");
  });
  it("leaves the original wallet usable when the current password is wrong", async () => {
    await saveKeystore("test-key-not-funded", "Purple-Tiger-42", { publicKey: "test-public", evm: "test-evm", accountId: "0.0.123" });
    const original = localStorage.getItem("aurion.keystore");
    await expect(changeDeviceCode("wrong", "482917")).rejects.toThrow();
    expect(localStorage.getItem("aurion.keystore")).toBe(original);
    expect(await unlockKeystore("Purple-Tiger-42")).toBe("test-key-not-funded");
  });
});