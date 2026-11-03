// Face ID / Touch ID / fingerprint unlock via WebAuthn PRF.
// The authenticator derives a secret that only exists after a biometric check.
// That secret encrypts the device passphrase. Nothing leaves this device.

const BIO = "aurion.bio";
type Stored = { credId: string; salt: string; iv: string; ct: string };

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

export function bioEnrolled(): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem(BIO);
}
export function bioRemove() { localStorage.removeItem(BIO); }

export async function bioAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}

async function aesFrom(prf: ArrayBuffer) {
  return crypto.subtle.importKey("raw", prf, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Register a biometric credential and seal the passphrase with it. */
export async function bioEnroll(passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "HashBase", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "aurion-device", displayName: "HashBase on this device" },
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
  localStorage.setItem(BIO, JSON.stringify({ credId: b64(credId), salt: b64(salt), iv: b64(iv), ct: b64(ct) } satisfies Stored));
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
  const s: Stored | null = JSON.parse(localStorage.getItem(BIO) ?? "null");
  if (!s) throw new Error("Biometrics not set up on this device");
  const prf = await evalPrf(unb64(s.credId), unb64(s.salt));
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv) }, await aesFrom(prf), unb64(s.ct));
    return new TextDecoder().decode(pt);
  } catch { throw new Error("Biometric key did not match. Use the passphrase."); }
}
