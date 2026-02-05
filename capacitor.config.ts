import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kamaho.clubleague',
  appName: 'Club League',
  webDir: 'dist',
  server: {
    // Uncomment for live reload when developing in simulator:
    // url: 'http://localhost:5173',
    // cleartext: true,
  },
};

export default config;
