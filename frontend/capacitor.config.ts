import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onnago.app',
  appName: 'ONNA-GO',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // In local development, Android emulator can point to http://10.0.2.2:8000
    // In production, specify HTTPS API URL
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
