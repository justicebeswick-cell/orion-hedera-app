import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.orionhedera.orion',
  appName: 'Orïon',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'never',
    backgroundColor: '#000000'
  },
  server: {
    url: 'https://orion-hedera.app',
    cleartext: false
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true
  }
};

export default config;

