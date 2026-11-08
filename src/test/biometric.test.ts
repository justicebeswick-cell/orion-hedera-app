import { beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { bioEnroll, bioEnrolled, bioPassphrase } from "@/lib/biometric";
import { activateSavedAccount, saveKeystore, setKeystoreAccount, unlockKeystore } from "@/lib/keystore";

const prf = new Uint8Array(32).fill(7).buffer;
const credential = () => ({ rawId: new Uint8Array([1, 2, 3]).buffer, getClientExtensionResults: () => ({ prf: { enabled: true, results: { first: prf } } }) });
const create = vi.fn(async () => credential());
const get = vi.fn(async () => credential());
const meta = { publicKey: "synthetic-public-key", evm: "synthetic-alias", accountId: "0.0.123", codeLength: 6 as const };

describe("fingerprint wallet binding", () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
    vi.stubGlobal("crypto", webcrypto);
    Object.defineProperty(navigator, "credentials", { configurable: true, value: { create, get } });
  });
  it("returns the verified active wallet code after fingerprint approval", async () => {
    await saveKeystore("synthetic-unfunded-key", "482917", meta);
    await bioEnroll("482917");
    expect(bioEnrolled()).toBe(true);
    expect(await bioPassphrase()).toBe("482917");
    expect(await unlockKeystore(await bioPassphrase())).toBe("synthetic-unfunded-key");
  });
  it("refuses enrollment of a wrong code without overwriting the working seal", async () => {
    await saveKeystore("synthetic-unfunded-key", "482917", meta);
    await bioEnroll("482917");
    const before = localStorage.getItem("aurion.bio");
    create.mockClear();
    await expect(bioEnroll("wrong-code")).rejects.toThrow("Wrong passphrase");
    expect(create).not.toHaveBeenCalled();
    expect(localStorage.getItem("aurion.bio")).toBe(before);
  });
  it("never uses one wallet's sealed code for another saved wallet", async () => {
    await saveKeystore("synthetic-key-a", "482917", meta);
    await bioEnroll("482917");
    await saveKeystore("synthetic-key-b", "739482", { ...meta, accountId: "0.0.456" });
    const before = localStorage.getItem("aurion.keystore");
    expect(bioEnrolled()).toBe(false);
    await expect(bioPassphrase()).rejects.toThrow("old code or another wallet");
    expect(get).not.toHaveBeenCalled();
    expect(localStorage.getItem("aurion.keystore")).toBe(before);
    expect(activateSavedAccount("0.0.123")).toBe(true);
    expect(await bioPassphrase()).toBe("482917");
  });
  it("detects an old unbound seal and keeps the wallet recoverable by code", async () => {
    await saveKeystore("synthetic-key", "482917", meta);
    await bioEnroll("482917");
    const seal = JSON.parse(localStorage.getItem("aurion.bio") ?? "{}");
    delete seal.walletBinding;
    localStorage.setItem("aurion.bio", JSON.stringify(seal));
    await saveKeystore("synthetic-key", "739482", meta);
    const before = localStorage.getItem("aurion.keystore");
    await expect(bioPassphrase()).rejects.toThrow("enable biometrics again");
    expect(localStorage.getItem("aurion.keystore")).toBe(before);
    expect(await unlockKeystore("739482")).toBe("synthetic-key");
    await bioEnroll("739482");
    expect(await bioPassphrase()).toBe("739482");
  });
  it("migrates a working legacy seal only after verifying its code", async () => {
    await saveKeystore("synthetic-key", "482917", meta);
    await bioEnroll("482917");
    const seal = JSON.parse(localStorage.getItem("aurion.bio") ?? "{}");
    delete seal.walletBinding;
    localStorage.setItem("aurion.bio", JSON.stringify(seal));
    expect(await bioPassphrase()).toBe("482917");
    expect(JSON.parse(localStorage.getItem("aurion.bio") ?? "{}").walletBinding).toBeTruthy();
  });
  it("keeps the binding when mainnet assigns the newly funded wallet an account ID", async () => {
    await saveKeystore("synthetic-key", "482917", { ...meta, accountId: null });
    await bioEnroll("482917");
    setKeystoreAccount("0.0.123");
    expect(await bioPassphrase()).toBe("482917");
  });
  it("rejects a wallet switch while the fingerprint prompt is open", async () => {
    await saveKeystore("synthetic-key-a", "482917", meta);
    await bioEnroll("482917");
    await saveKeystore("synthetic-key-b", "739482", { ...meta, accountId: "0.0.456" });
    activateSavedAccount("0.0.123");
    get.mockImplementationOnce(async () => { activateSavedAccount("0.0.456"); return credential(); });
    await expect(bioPassphrase()).rejects.toThrow("old code or another wallet");
  });
});