import { ACCOUNT_RE } from "./hedera";

export const EVM_RE = /^0x[0-9a-f]{40}$/i;
export function isHbarRecipient(value: string): boolean {
  return ACCOUNT_RE.test(value.trim()) || EVM_RE.test(value.trim());
}
/** Long-zero addresses identify existing numbered accounts, not new wallet keys. */
export function isNewWalletAlias(value: string): boolean {
  return EVM_RE.test(value) && !/^0x0{24}/i.test(value);
}
export function parseQrRecipient(text: string, allowEvm = false): string | null {
  if (allowEvm) {
    const alias = text.match(/\b0x[0-9a-f]{40}\b/i)?.[0];
    if (alias) return alias;
  }
  return text.match(/\b0\.0\.\d+(?:-[a-z]{5})?\b/i)?.[0]?.split("-")[0] ?? null;
}