import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gravelai.app',
  appName: 'Gravel Planner',
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
    GoogleAuth: {
      // Web Client ID (OAuth 2.0) dal progetto Firebase Console
      // Necessario per autenticazione nativa su Android via @codetrix-studio/capacitor-google-auth
      serverClientId: '98761873084-k38c50d0fp9qkbotaib8b3tv33tdnngc.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true,
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
