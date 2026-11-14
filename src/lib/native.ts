import { Capacitor, registerPlugin } from '@capacitor/core';

export function isNativeApp() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}
export function isNativeIos() {
  return isNativeApp() && Capacitor.getPlatform() === 'ios';
}

// Implemented by OrionBiometricVault in the Xcode target. Keychain itself
// requires current-set biometrics; a successful JS prompt alone is not enough.
export const nativeBiometricVault = registerPlugin<{
  enroll(options: { code: string; binding: string }): Promise<void>;
  unlock(): Promise<{ code: string; binding: string }>;
  remove(): Promise<void>;
}>('OrionBiometricVault');

export async function nativeTapHaptic() {
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
}