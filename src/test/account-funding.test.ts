import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkSend } from "@/lib/guard";
import { isHbarRecipient, parseQrRecipient } from "@/lib/recipient";

const alias = "0x1234567890abcdef1234567890abcdef12345678";
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
it("accepts a new wallet's 0x address as an HBAR recipient", () => {
  expect(isHbarRecipient(alias)).toBe(true);
  expect(isHbarRecipient("0.0.456")).toBe(true);
  expect(isHbarRecipient("0x1234")).toBe(false);
});
it("reads the new wallet funding QR only when alias support is enabled", () => {
  expect(parseQrRecipient(alias, true)).toBe(alias);
  expect(parseQrRecipient(alias)).toBeNull();
  expect(parseQrRecipient("hedera:0.0.456", true)).toBe("0.0.456");
});
it("allows a missing EVM alias to be funded with an immediate HBAR send", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 404)));
  expect(await checkSend("0.0.123", alias, 1, { allowNewAccount: true })).toBeNull();
});
it("does not relax existing-account checks for other transfers", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 404)));
  expect(await checkSend("0.0.123", alias, 1)).toContain("does not exist");
});
it("rejects nonexistent numbered accounts even in HBAR funding mode", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 404)));
  expect(await checkSend("0.0.123", "0.0.456", 1, { allowNewAccount: true })).toContain("does not exist");
});
it("does not create accounts at a missing long-zero numbered address", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 404)));
  expect(await checkSend("0.0.123", "0x00000000000000000000000000000000000001c8", 1, { allowNewAccount: true })).toContain("does not exist");
});
it("fails closed on mirror outages rather than treating them as new accounts", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 503)));
  expect(await checkSend("0.0.123", alias, 1, { allowNewAccount: true })).toContain("unavailable");
});
it("blocks a numbered account even when addressed by its alias", async () => {
  localStorage.setItem("aurion.blocklist", JSON.stringify(["0.0.456"]));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ account: "0.0.456" })));
  expect(await checkSend("0.0.123", alias, 1, { allowNewAccount: true })).toContain("blocked");
});
it("blocks self transfers through an alias", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ account: "0.0.123" })));
  expect(await checkSend("0.0.123", alias, 1, { allowNewAccount: true })).toContain("yourself");
});
it("retains send limits for new-account funding", async () => {
  expect(await checkSend("0.0.123", alias, 1001, { allowNewAccount: true })).toContain("Send limit");
});
it("rejects invalid transfer amounts", async () => {
  expect(await checkSend("0.0.123", alias, Infinity, { allowNewAccount: true })).toContain("positive");
});
it("rejects deleted recipients", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ account: "0.0.456", deleted: true })));
  expect(await checkSend("0.0.123", alias, 1, { allowNewAccount: true })).toContain("deleted");
});