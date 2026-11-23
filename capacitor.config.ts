import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.orionhedera.orion',
  appName: 'Oreon',
  webDir: 'dist',
  server: {
    url: 'https://orion-hedera.app',
    cleartext: false
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: true
  }
};

export default config;
