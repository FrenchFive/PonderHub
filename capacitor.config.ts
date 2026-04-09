import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.frenchfive.ponderhub',
  appName: 'PonderHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#007AFF',
    },
  },
};

export default config;
