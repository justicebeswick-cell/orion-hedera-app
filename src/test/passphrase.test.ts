import { describe, it, expect } from "vitest";
import { checkPassphrase, pickCheckPositions } from "@/lib/passphrase";

describe("passphrase rules", () => {
  it("accepts 6, 8 and 10 digit codes", () => {
    expect(checkPassphrase("482917").ok).toBe(true);
    expect(checkPassphrase("48291736").ok).toBe(true);
    expect(checkPassphrase("4829173650").ok).toBe(true);
  });
  it("refuses other digit lengths", () => {
    expect(checkPassphrase("48291").ok).toBe(false);
    expect(checkPassphrase("4829173").ok).toBe(false);
    expect(checkPassphrase("482917365").ok).toBe(false);
  });
  it("refuses guessable codes", () => {
    for (const p of ["123456", "000000", "121212", "654321", "19900515"]) expect(checkPassphrase(p).ok).toBe(false);
  });
  it("accepts any reasonable password", () => {
    expect(checkPassphrase("Purple-Tiger-42").ok).toBe(true);
  });
  it("refuses common or short passwords", () => {
    for (const p of ["password1", "Qwerty123", "abc", "aaaaaaaaaa", "abcdefgh"]) expect(checkPassphrase(p).ok).toBe(false);
  });
  it("picks 3 distinct backup words", () => {
    const pos = pickCheckPositions(24);
    expect(new Set(pos).size).toBe(3);
    expect(pos.every((i) => i >= 0 && i < 24)).toBe(true);
  });
});
