import { beforeEach, expect, it } from "vitest";
import { listSavedAccounts, rememberAccount, renameSavedAccount } from "@/lib/keystore";

beforeEach(() => localStorage.clear());

it("preserves a freely chosen wallet name across remembering the same account", () => {
  rememberAccount("0.0.123");
  renameSavedAccount("0.0.123", "Justice's savings 💜");
  rememberAccount("0.0.123");
  expect(listSavedAccounts().find((account) => account.id === "0.0.123")?.label).toBe("Justice's savings 💜");
});