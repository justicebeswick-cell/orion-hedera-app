// Passphrase rules: either a PIN of exactly 6, 8 or 10 digits, or a password of 8+ characters.
// Obviously guessable choices are refused.

export type Strength = { ok: boolean; score: 0 | 1 | 2 | 3 | 4; label: string; reason?: string; pin: boolean };

const COMMON = [
  "password", "passw0rd", "qwerty", "qwertyuiop", "letmein", "welcome", "iloveyou", "admin", "abc123",
  "monkey", "dragon", "football", "baseball", "master", "sunshine", "princess", "shadow", "superman",
  "trustno1", "hello", "freedom", "whatever", "hedera", "hbar", "hashbase", "bitcoin", "crypto", "wallet",
  "asdfgh", "asdfghjkl", "zxcvbn", "zxcvbnm", "1q2w3e4r", "qazwsx", "changeme", "secret", "login",
];

function sequential(s: string): boolean {
  if (s.length < 3) return false;
  const c = [...s].map((x) => x.toLowerCase().charCodeAt(0));
  const up = c.every((v, i) => i === 0 || v - c[i - 1]! === 1 || (v === 48 && c[i - 1] === 57));
  const down = c.every((v, i) => i === 0 || c[i - 1]! - v === 1 || (v === 57 && c[i - 1] === 48));
  return up || down;
}

function repeatsShortChunk(s: string): boolean {
  for (let n = 1; n <= Math.floor(s.length / 2); n++) {
    if (s.length % n) continue;
    if (s.slice(0, n).repeat(s.length / n) === s) return true;
  }
  return false;
}

export function isPin(p: string) { return /^\d+$/.test(p); }

/** New device codes; legacy password/PIN validation stays compatible. */
export function checkDeviceCode(p: string): Strength {
  if (!/^\d+$/.test(p) || ![4, 6, 8].includes(p.length))
    return { ok: false, score: 0, label: "Incomplete", reason: "Choose a 4, 6 or 8 digit code.", pin: true };
  if (repeatsShortChunk(p) || sequential(p) || new Set(p).size < 3 || ["2580", "0852", "1379", "1004", "2000", "2026"].includes(p) || /^(19|20)\d{2}$/.test(p))
    return { ok: false, score: 1, label: "Too easy", reason: "Avoid repeated digits, counting, keypad patterns and years.", pin: true };
  if (p.length > 4) return checkPassphrase(p);
  return { ok: true, score: 1, label: "Basic protection", pin: true };
}

export function checkPassphrase(p: string): Strength {
  if (!p) return { ok: false, score: 0, label: "", pin: false };
  if (isPin(p)) {
    if (![6, 8, 10].includes(p.length))
      return { ok: false, score: 0, label: "Too short", reason: "A number code must be exactly 6, 8 or 10 digits.", pin: true };
    if (repeatsShortChunk(p)) return { ok: false, score: 0, label: "Too easy", reason: "Repeating digits are easy to guess.", pin: true };
    if (sequential(p)) return { ok: false, score: 0, label: "Too easy", reason: "Counting up or down is easy to guess.", pin: true };
    if (new Set(p).size <= 2) return { ok: false, score: 1, label: "Too easy", reason: "Use more different digits.", pin: true };
    if (/^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(p) || /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(19|20)\d{2}$/.test(p))
      return { ok: false, score: 1, label: "Too easy", reason: "Dates like birthdays are easy to guess.", pin: true };
    const score = p.length === 6 ? 2 : p.length === 8 ? 3 : 4;
    return { ok: true, score, label: score === 2 ? "Okay" : score === 3 ? "Good" : "Strong", pin: true };
  }
  if (p.length < 8) return { ok: false, score: 0, label: "Too short", reason: "Use at least 8 characters, or a 6, 8 or 10 digit code.", pin: false };
  const low = p.toLowerCase();
  const stripped = low.replace(/[^a-z]/g, "");
  if (COMMON.some((w) => low === w || stripped === w || (low.startsWith(w) && /^[\d!@#$%.]*$/.test(low.slice(w.length)))))
    return { ok: false, score: 0, label: "Too easy", reason: "That's one of the most common passwords.", pin: false };
  if (repeatsShortChunk(low) || sequential(low)) return { ok: false, score: 0, label: "Too easy", reason: "Patterns like that are easy to guess.", pin: false };
  if (new Set(low).size < 4) return { ok: false, score: 1, label: "Too easy", reason: "Use more different characters.", pin: false };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  let score = (p.length >= 16 ? 2 : p.length >= 12 ? 1 : 0) + (kinds >= 3 ? 2 : kinds === 2 ? 1 : 0);
  score = Math.max(1, Math.min(4, score));
  if (score < 2) return { ok: false, score: 1, label: "Weak", reason: "Make it longer, or mix in numbers or symbols.", pin: false };
  return { ok: true, score: score as 2 | 3 | 4, label: score === 2 ? "Okay" : score === 3 ? "Good" : "Strong", pin: false };
}

/** Pick `n` distinct random word positions (0-based) for the backup check. */
export function pickCheckPositions(total: number, n = 3): number[] {
  const out = new Set<number>();
  const buf = new Uint32Array(1);
  while (out.size < Math.min(n, total)) { crypto.getRandomValues(buf); out.add(buf[0]! % total); }
  return [...out].sort((a, b) => a - b);
}
