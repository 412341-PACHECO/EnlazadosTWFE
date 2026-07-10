import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.enlazadostw.app',
  appName: 'enlazadosTWFE',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
