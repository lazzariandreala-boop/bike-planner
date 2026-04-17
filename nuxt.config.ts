// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, // REQUIRED for Capacitor

  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  app: {
    head: {
      title: 'Gravel Planner',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#0f1a0f' },
      ],
      script: [
        { src: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.js', defer: false },
      ],
      link: [
        // MapLibre GL CSS
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.css' },
        // Fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..400&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Firebase
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || '',
      // APIs
      orsApiKey: process.env.ORS_API_KEY || '',
      groqApiKey: process.env.GROQ_API_KEY || '',
    },
  },

  tailwindcss: {
    config: {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            display: ['Bebas Neue', 'cursive'],
            sans: ['DM Sans', 'sans-serif'],
            mono: ['IBM Plex Mono', 'monospace'],
          },
          colors: {
            terrain: {
              950: '#080f08',
              900: '#0f1a0f',
              800: '#152415',
              700: '#1e321e',
              600: '#2a4a2a',
              500: '#3d6b3d',
              400: '#5a9b5a',
            },
            moss: {
              400: '#8bb940',
              500: '#7aa832',
              600: '#668d29',
            },
            amber: {
              400: '#e8aa3a',
              500: '#c49a2a',
              600: '#a07e1e',
            },
            parchment: {
              50: '#f5f0e0',
              100: '#e8f0d0',
              200: '#d4e0b0',
              300: '#b8cc80',
            },
          },
        },
      },
    },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Cross-Origin-Opener-Policy': 'unsafe-none',
        },
      },
    },
  },

  vite: {
    define: {
      global: 'globalThis',
    },
  },

  compatibilityDate: '2024-09-10',
})
