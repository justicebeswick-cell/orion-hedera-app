// Device keystore. Keys never leave the browser. AES-GCM, key derived with Argon2id.
import { MIRROR } from "./hedera";

const KS = "aurion.keystore";
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

async function deriveKey(pass: string, salt: Uint8Array) {
  const { argon2id } = await import("hash-wasm");
  const raw = await argon2id({
    password: pass, salt, parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: "binary",
  });
  return crypto.subtle.importKey("raw", raw as Uint8Array<ArrayBuffer>, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export type StoredKey = { publicKey: string; evm: string; accountId: string | null; kind?: "ecdsa" | "ed25519" };

export async function saveKeystore(privHex: string, pass: string, meta: StoredKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(privHex)));
  localStorage.setItem(KS, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct), ...meta }));
  rememberKeystore();
}

// Saved accounts: every account used on this device, with its encrypted key blob if it has one.
const SAVED = "aurion.accounts";
export type SavedAccount = { id: string; label: string; blob?: string; added: number };
function readSaved(): Record<string, SavedAccount> {
  try { return JSON.parse(localStorage.getItem(SAVED) ?? "{}"); } catch { return {}; }
}
export function listSavedAccounts(): SavedAccount[] {
  return Object.values(readSaved()).sort((a, b) => b.added - a.added);
}
export function rememberAccount(id: string) {
  const all = readSaved();
  const cur = localStorage.getItem(KS);
  const curId = cur ? JSON.parse(cur).accountId : null;
  all[id] = { id, label: all[id]?.label ?? "", added: Date.now(), blob: curId === id ? cur! : all[id]?.blob };
  localStorage.setItem(SAVED, JSON.stringify(all));
}
function rememberKeystore() {
  const cur = localStorage.getItem(KS);
  const id = cur ? JSON.parse(cur).accountId : null;
  if (id) rememberAccount(id);
}
export function renameSavedAccount(id: string, label: string) {
  const all = readSaved(); if (!all[id]) return;
  all[id].label = label; localStorage.setItem(SAVED, JSON.stringify(all));
}
export function forgetSavedAccount(id: string) {
  const all = readSaved(); delete all[id]; localStorage.setItem(SAVED, JSON.stringify(all));
}
/** Make a saved account's key the active device key. */
export function activateSavedAccount(id: string): boolean {
  const blob = readSaved()[id]?.blob;
  if (!blob) return false;
  localStorage.setItem(KS, blob);
  return true;
}

export function readKeystoreMeta(): StoredKey | null {
  const s = localStorage.getItem(KS);
  if (!s) return null;
  const { publicKey, evm, accountId, kind } = JSON.parse(s);
  return { publicKey, evm, accountId, kind };
}

export function setKeystoreAccount(accountId: string) {
  const s = localStorage.getItem(KS);
  if (!s) return;
  localStorage.setItem(KS, JSON.stringify({ ...JSON.parse(s), accountId }));
  rememberKeystore();
}

export async function unlockKeystore(pass: string): Promise<string> {
  const s = JSON.parse(localStorage.getItem(KS) ?? "null");
  if (!s) throw new Error("No key on this device");
  const key = await deriveKey(pass, unb64(s.salt));
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv) }, key, unb64(s.ct));
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("Wrong passphrase");
  }
}

export function clearKeystore() {
  localStorage.removeItem(KS);
}

/** New ECDSA key from a fresh 24-word phrase. */
export async function generateWallet() {
  const { Mnemonic } = await import("@hashgraph/sdk");
  const m = await Mnemonic.generate();
  const pk = await m.toStandardECDSAsecp256k1PrivateKey("", 0);
  return {
    phrase: m.toString(),
    privHex: pk.toStringRaw(),
    publicKey: pk.publicKey.toStringRaw(),
    evm: "0x" + pk.publicKey.toEvmAddress(),
  };
}

/** Import from a recovery phrase or a raw/DER private key. */
export async function importWallet(input: string) {
  const { Mnemonic, PrivateKey } = await import("@hashgraph/sdk");
  const t = input.trim();
  const words = t.split(/\s+/);
  const out: { privHex: string; publicKey: string; evm: string | null; kind: "ecdsa" | "ed25519" }[] = [];
  if (words.length === 12 || words.length === 24) {
    const m = await Mnemonic.fromString(words.join(" "));
    const e = await m.toStandardECDSAsecp256k1PrivateKey("", 0);
    const d = await m.toStandardEd25519PrivateKey("", 0);
    out.push({ privHex: e.toStringRaw(), publicKey: e.publicKey.toStringRaw(), evm: "0x" + e.publicKey.toEvmAddress(), kind: "ecdsa" });
    out.push({ privHex: d.toStringRaw(), publicKey: d.publicKey.toStringRaw(), evm: null, kind: "ed25519" });
    try {
      const legacy = await m.toLegacyPrivateKey();
      out.push({ privHex: legacy.toStringRaw(), publicKey: legacy.publicKey.toStringRaw(), evm: null, kind: "ed25519" });
    } catch { /* not a legacy phrase */ }
  } else {
    const hex = t.replace(/^0x/, "");
    for (const [kind, parse] of [
      ["ecdsa", () => PrivateKey.fromStringECDSA(hex)],
      ["ed25519", () => PrivateKey.fromStringED25519(hex)],
    ] as const) {
      try {
        const k = hex.length > 64 ? PrivateKey.fromStringDer(hex) : parse();
        out.push({
          privHex: k.toStringRaw(), publicKey: k.publicKey.toStringRaw(),
          evm: k.type === "secp256k1" ? "0x" + k.publicKey.toEvmAddress() : null, kind,
        });
      } catch { /* try next */ }
    }
  }
  if (!out.length) throw new Error("Not a recovery phrase or private key");
  return out;
}

/** Find the mainnet account that holds this public key. */
export async function findAccountByKey(publicKey: string): Promise<string | null> {
  const r = await fetch(`${MIRROR}/api/v1/accounts?account.publickey=${publicKey}&limit=1`).catch(() => {
    throw new Error("Hedera unreachable");
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.accounts?.[0]?.account ?? null;
}

/** Auto-created accounts appear once HBAR lands on the EVM address. */
export async function findAccountByEvm(evm: string): Promise<string | null> {
  const r = await fetch(`${MIRROR}/api/v1/accounts/${evm}`).catch(() => {
    throw new Error("Hedera unreachable");
  });
  if (!r.ok) return null;
  return (await r.json()).account ?? null;
}
