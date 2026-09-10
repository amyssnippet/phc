import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gov.maharashtra.mahaswasthya',
  appName: 'MahaSwasthya Grid',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
