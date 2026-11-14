import { beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { argon2id } from "hash-wasm";
import { generateWallet, KEYSTORE_KDF, saveKeystore, unlockKeystore } from "@/lib/keystore";

// SDK generation is exercised in the browser; avoid loading its Node transport graph in jsdom.
const sdk = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@hashgraph/sdk", () => ({ Mnemonic: { generate: sdk.generate } }));

const meta = { publicKey: "test-public", evm: "test-evm", accountId: null };
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const readBlob = () => JSON.parse(localStorage.getItem("aurion.keystore") ?? "null");

describe("wallet encryption safeguards", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); });

  it("uses 256-bit AES with 64 MiB and four Argon2id passes for new wallets", async () => {
    expect(KEYSTORE_KDF).toEqual({ parallelism: 1, iterations: 4, memorySize: 65536, hashLength: 32 });
    await saveKeystore("synthetic-private-key", "48291736", meta);
    expect(readBlob().v).toBe(2);
    expect(atob(readBlob().salt).length).toBe(32);
    expect(atob(readBlob().iv).length).toBe(12);
    expect(atob(readBlob().ct).length).toBe(new TextEncoder().encode("synthetic-private-key").length + 16);
    expect(await unlockKeystore("48291736")).toBe("synthetic-private-key");
  });

  it("uses fresh salt and IV even when saving the same key and code", async () => {
    await saveKeystore("synthetic-private-key", "48291736", meta);
    const first = readBlob();
    await saveKeystore("synthetic-private-key", "48291736", meta);
    const second = readBlob();
    expect(second.salt).not.toBe(first.salt);
    expect(second.iv).not.toBe(first.iv);
    expect(second.ct).not.toBe(first.ct);
    expect(localStorage.getItem("aurion.keystore")).not.toContain("synthetic-private-key");
  });

  it("rejects incorrect codes and tampered ciphertext", async () => {
    await saveKeystore("synthetic-private-key", "48291736", meta);
    await expect(unlockKeystore("58302647")).rejects.toThrow("Wrong passphrase");
    const blob = readBlob();
    const ciphertext = Uint8Array.from(atob(blob.ct), c => c.charCodeAt(0));
    ciphertext[0] = (ciphertext[0] ?? 0) ^ 1;
    localStorage.setItem("aurion.keystore", JSON.stringify({ ...blob, ct: encode(ciphertext) }));
    await expect(unlockKeystore("48291736")).rejects.toThrow();
  });

  it("cannot downgrade an authenticated v2 blob to legacy encryption", async () => {
    await saveKeystore("synthetic-private-key", "48291736", meta);
    localStorage.setItem("aurion.keystore", JSON.stringify({ ...readBlob(), v: 1 }));
    await expect(unlockKeystore("48291736")).rejects.toThrow();
  });

  it("reads genuine legacy three-pass wallets without changing their stored blob", async () => {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const raw = await argon2id({ password: "legacy-password", salt, parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: "binary" });
    const key = await webcrypto.subtle.importKey("raw", raw as Uint8Array<ArrayBuffer>, "AES-GCM", false, ["encrypt"]);
    const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode("legacy-synthetic-key")));
    const original = JSON.stringify({ ...meta, v: 1, salt: encode(salt), iv: encode(iv), ct: encode(ct) });
    localStorage.setItem("aurion.keystore", original);
    expect(await unlockKeystore("legacy-password")).toBe("legacy-synthetic-key");
    expect(localStorage.getItem("aurion.keystore")).toBe(original);
  });

  it("fails closed when device cryptography is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    await expect(generateWallet()).rejects.toThrow("device cryptography");
    await expect(saveKeystore("synthetic-private-key", "48291736", meta)).rejects.toThrow();
    expect(localStorage.getItem("aurion.keystore")).toBeNull();
  });

  it("rejects a phrase shorter than the required 24 words", async () => {
    sdk.generate.mockResolvedValue({ toString: () => Array(12).fill("abandon").join(" ") });
    await expect(generateWallet()).rejects.toThrow("Recovery phrase generation failed");
  });
});