import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gravelai.app',
  appName: 'GravelAI',
  webDir: '.output/public', // nuxt generate output
  server: {
    androidScheme: 'https',
    // Per sviluppo con live reload (opzionale):
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f1a0f',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f1a0f',
      showSpinner: false,
    },
    Geolocation: {
      // Android permissions gestite in AndroidManifest.xml (auto-aggiunte da Capacitor)
    },
  },
  android: {
    buildOptions: {
      keystorePath: 'gravel-ai.keystore',
      keystorePassword: 'your-keystore-password',
      keystoreAlias: 'gravel-ai',
      keystoreAliasPassword: 'your-alias-password',
      releaseType: 'APK',
    },
  },
}

export default config
