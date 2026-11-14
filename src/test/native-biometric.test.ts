import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const native = vi.hoisted(() => ({ enroll: vi.fn(), unlock: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/native', () => ({ isNativeIos: () => true, nativeBiometricVault: native }));
import { bioEnroll, bioPassphrase } from '@/lib/biometric';
import { saveKeystore } from '@/lib/keystore';
const meta = { publicKey: 'synthetic', evm: 'synthetic', accountId: '0.0.123', codeLength: 6 as const };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto);
});
it('keeps the verified native code out of browser storage', async () => {
  await saveKeystore('synthetic-key', '482917', meta);
  await bioEnroll('482917');
  expect(native.enroll).toHaveBeenCalledWith({ code: '482917', binding: expect.any(String) });
  expect(localStorage.getItem('aurion.bio')).not.toContain('482917');
});
it('does not enroll a wrong code in native secure storage', async () => {
  await saveKeystore('synthetic-key', '482917', meta);
  await expect(bioEnroll('111111')).rejects.toThrow('Wrong passphrase');
  expect(native.enroll).not.toHaveBeenCalled();
});
it('rejects native cancellation without falling back to an unprotected code', async () => {
  await saveKeystore('synthetic-key', '482917', meta); await bioEnroll('482917');
  native.unlock.mockRejectedValueOnce(new Error('Biometric check cancelled'));
  await expect(bioPassphrase()).rejects.toThrow('cancelled');
});
it('rejects a Keychain code bound to another wallet revision', async () => {
  await saveKeystore('synthetic-key', '482917', meta); await bioEnroll('482917');
  native.unlock.mockResolvedValueOnce({ code: '482917', binding: 'another-wallet' });
  await expect(bioPassphrase()).rejects.toThrow('old code or another wallet');
});
it('returns a native code only after checking the binding and decrypting the wallet', async () => {
  await saveKeystore('synthetic-key', '482917', meta); await bioEnroll('482917');
  const marker = JSON.parse(localStorage.getItem('aurion.bio') ?? '{}');
  native.unlock.mockResolvedValueOnce({ code: '482917', binding: marker.walletBinding });
  expect(await bioPassphrase()).toBe('482917');
});