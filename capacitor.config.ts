import type { CapacitorConfig } from '@capacitor/cli';

// Orion needs its hosted server for AI and uploads; dist is not a standalone app.
const config: CapacitorConfig = {
  appId: 'app.orionhedera.wallet',
  appName: 'Orion',
  webDir: 'native-web',
  server: { url: 'https://orion-hedera.app', cleartext: false },
  ios: { contentInset: 'never', backgroundColor: '#000000', preferredContentMode: 'mobile' },
  android: { backgroundColor: '#000000' },
  plugins: { SplashScreen: { backgroundColor: '#000000', launchAutoHide: true, launchShowDuration: 500 } },
};

export default config;