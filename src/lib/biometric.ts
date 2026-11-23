// Face ID / Touch ID / fingerprint unlock via WebAuthn PRF.
// The authenticator derives a secret that only exists after a biometric check.
// That secret encrypts the device passphrase. Nothing leaves this device.

import { unlockKeystore } from "./keystore";
import { isNativeIos, nativeBiometricVault } from "./native";

const BIO = "aurion.bio";
type Stored = { credId: string; salt: string; iv: string; ct: string; walletBinding?: string; native?: boolean };
const RESET = "Fingerprint is linked to an old code or another wallet. Enter this wallet's code, then enable biometrics again in Settings → Security.";

// Salt and IV identify the encrypted key, including code rotations, without storing keys.
function walletBinding(): string | null {
  try {
    const key = JSON.parse(localStorage.getItem("aurion.keystore") ?? "null");
    return key?.salt && key?.iv ? `${key.salt}:${key.iv}` : null;
  } catch { return null; }
}

function storedSeal(): Stored | null {
  try { return JSON.parse(localStorage.getItem(BIO) ?? "null"); } catch { return null; }
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

export function bioEnrolled(): boolean {
  if (typeof localStorage === "undefined") return false;
  const seal = storedSeal();
  const binding = walletBinding();
  return !!seal && !!binding && (!seal.native || isNativeIos()) && (!seal.walletBinding || seal.walletBinding === binding);
}
export function bioRemove() {
  localStorage.removeItem(BIO);
  if (isNativeIos()) void nativeBiometricVault.remove().catch(() => {});
}

export async function bioAvailable(): Promise<boolean> {
  if (isNativeIos()) {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      return (await BiometricAuth.checkBiometry()).strongBiometryIsAvailable;
    } catch { return false; }
  }
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}

async function aesFrom(prf: ArrayBuffer) {
  return crypto.subtle.importKey("raw", prf, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Register a biometric credential and seal the passphrase with it. */
export async function bioEnroll(passphrase: string) {
  // Never seal an unverified code, or a code intended for a not-yet-saved wallet.
  await unlockKeystore(passphrase);
  const binding = walletBinding();
  if (!binding) throw new Error("Save this wallet's key before enabling biometrics.");
  if (isNativeIos()) {
    await nativeBiometricVault.enroll({ code: passphrase, binding });
    if (walletBinding() !== binding) {
      await nativeBiometricVault.remove();
      throw new Error(RESET);
    }
    // Public marker only. No code or secret is stored in localStorage.
    localStorage.setItem(BIO, JSON.stringify({ native: true, walletBinding: binding, credId: '', salt: '', iv: '', ct: '' } satisfies Stored));
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Oreon", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "aurion-device", displayName: "Oreon on this device" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  }).catch(() => { throw new Error("Biometric setup cancelled"); })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Biometric setup cancelled");
  const credId = new Uint8Array(cred.rawId);
  let prf = (cred.getClientExtensionResults() as any).prf?.results?.first as ArrayBuffer | undefined;
  if (!prf) {
    // Some platforms only return PRF output on sign-in, not on creation.
    if (!(cred.getClientExtensionResults() as any).prf?.enabled) throw new Error("This device's biometrics can't protect keys. Use the passphrase.");
    prf = await evalPrf(credId, salt);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesFrom(prf), new TextEncoder().encode(passphrase)));
  if (walletBinding() !== binding) throw new Error("Wallet changed during fingerprint setup. Try again for the selected wallet.");
  localStorage.setItem(BIO, JSON.stringify({ credId: b64(credId), salt: b64(salt), iv: b64(iv), ct: b64(ct), walletBinding: binding } satisfies Stored));
}

async function evalPrf(credId: Uint8Array, salt: Uint8Array): Promise<ArrayBuffer> {
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: credId as Uint8Array<ArrayBuffer> }],
      userVerification: "required",
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  }).catch(() => { throw new Error("Biometric check cancelled"); })) as PublicKeyCredential | null;
  const out = (a?.getClientExtensionResults() as any)?.prf?.results?.first as ArrayBuffer | undefined;
  if (!out) throw new Error("Biometric check returned no key. Use the passphrase.");
  return out;
}

/** Biometric check, then return the device passphrase. */
export async function bioPassphrase(): Promise<string> {
  const s = storedSeal();
  if (!s) throw new Error("Biometrics not set up on this device");
  const binding = walletBinding();
  if (!binding || (s.walletBinding && s.walletBinding !== binding)) throw new Error(RESET);
  if (s.native) {
    if (!isNativeIos()) throw new Error(RESET);
    const result = await nativeBiometricVault.unlock();
    if (walletBinding() !== binding || result.binding !== binding) throw new Error(RESET);
    try { await unlockKeystore(result.code); } catch { throw new Error(RESET); }
    if (walletBinding() !== binding) throw new Error(RESET);
    return result.code;
  }
  const prf = await evalPrf(unb64(s.credId), unb64(s.salt));
  let passphrase: string;
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv) }, await aesFrom(prf), unb64(s.ct));
    passphrase = new TextDecoder().decode(pt);
  } catch { throw new Error("Biometric key did not match. Use the passphrase."); }
  if (walletBinding() !== binding) throw new Error(RESET);
  try { await unlockKeystore(passphrase); } catch { throw new Error(RESET); }
  if (walletBinding() !== binding) throw new Error(RESET);
  // Existing installations migrate only after their sealed code actually unlocks the key.
  if (!s.walletBinding) localStorage.setItem(BIO, JSON.stringify({ ...s, walletBinding: binding }));
  return passphrase;
}
