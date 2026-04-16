# 🚴 GravelAI — Route Planner

Pianificatore percorsi gravel con AI. Nuxt 3 + Capacitor + Firebase + OpenRouteService.

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Nuxt 3 (SSR off) + Tailwind CSS |
| Mobile | Capacitor 6 (Android/iOS) |
| Mappa | Leaflet + OpenStreetMap |
| Routing | OpenRouteService API (gratis fino a 2000 req/day) |
| Auth + DB | Firebase Auth (Google OAuth) + Firestore |
| AI | Claude API (descrizioni e nomi percorsi) |

---

## Setup

### 1. Clona e installa

```bash
npm install
```

### 2. Variabili d'ambiente

```bash
cp .env.example .env
```

Poi compila `.env` con:

#### Firebase
1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuovo progetto
3. Aggiungi un'app Web
4. Copia le credenziali nel `.env`
5. **Authentication** → Enable → Google provider
6. **Firestore Database** → Crea database → Inizia in modalità test (poi metti le security rules)

#### OpenRouteService
1. Registrati su [openrouteservice.org](https://openrouteservice.org)
2. Dashboard → API Keys → Crea chiave
3. Free tier: **2000 request/giorno** (più che sufficiente per dev)

#### Anthropic
1. [console.anthropic.com](https://console.anthropic.com) → API Keys
2. Funziona anche senza: le descrizioni AI semplicemente non vengono generate

### 3. Dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Build APK (Android)

### Prima volta
```bash
# 1. Genera il sito statico
npm run generate

# 2. Aggiungi la piattaforma Android
npm run cap:init    # = npx cap add android

# 3. Sincronizza
npm run cap:sync
```

### Build debug (veloce, per test)
```bash
npm run cap:build:debug
# APK in: android/app/build/outputs/apk/debug/app-debug.apk
```

### Build release (per pubblicazione)
```bash
# Prima crea il keystore se non esiste:
keytool -genkey -v -keystore gravel-ai.keystore -alias gravel-ai -keyalg RSA -keysize 2048 -validity 10000

# Poi aggiorna capacitor.config.ts con le password

npm run cap:build:release
# APK in: android/app/build/outputs/apk/release/app-release.apk
```

### Aprire in Android Studio (opzionale)
```bash
npm run cap:open
```

### Live reload su device fisico
```bash
# In capacitor.config.ts, decommentare:
# server: { url: 'http://192.168.x.x:3000', cleartext: true }

npm run dev
npm run cap:sync
npm run cap:open
# → Run in Android Studio
```

---

## Firebase Security Rules (Firestore)

Dopo il test, sostituisci le regole in Firestore console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /routes/{routeId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---

## Struttura Progetto

```
gravel-planner/
├── pages/
│   ├── index.vue          # Login page
│   ├── map.vue            # 🗺️ Mappa + pianificazione (core)
│   ├── routes/index.vue   # Lista percorsi salvati
│   └── profile.vue        # Profilo utente + preferenze
├── components/
│   ├── AppHeader.vue      # Navbar desktop + bottom nav mobile
│   ├── RoutePanel.vue     # Pannello laterale/bottom sheet pianificazione
│   ├── RouteResult.vue    # Card risultato percorso calcolato
│   ├── RouteCard.vue      # Card percorso in lista
│   └── SurfaceSelector.vue # Drag & drop superfici
├── composables/
│   ├── useORS.ts          # OpenRouteService API (routing + geocoding)
│   ├── useAI.ts           # Claude API (descrizioni AI)
│   └── useGeolocation.ts  # GPS (web + Capacitor)
├── stores/
│   ├── auth.ts            # Firebase Auth + profilo utente
│   └── routes.ts          # CRUD percorsi su Firestore
├── plugins/
│   └── firebase.client.ts # Init Firebase
├── middleware/
│   └── auth.ts            # Route guard
└── types/
    └── index.ts           # TypeScript types
```

---

## Logica superfici → ORS

Le superfici scelte dall'utente vengono tradotte in parametri ORS:

| Superficie | Profilo ORS | Green weight | Quiet weight |
|---|---|---|---|
| Pista ciclabile | cycling-road | 0.3 | 0.8 |
| Ghiaia | cycling-mountain | 0.9 | 0.7 |
| Sterrato | cycling-mountain | 0.8 | 0.6 |
| Terra battuta | cycling-mountain | 0.9 | 0.5 |
| Erba | cycling-mountain | 1.0 | 0.4 |
| Asfalto | cycling-road | 0.0 | 0.3 |

Il **profilo** è determinato dalla superficie in cima alla lista priorità. I **pesi** sono una media pesata delle prime 3 preferenze.

---

## Estensioni future (roadmap)

- [ ] Export GPX / KML
- [ ] Modalità navigazione turn-by-turn
- [ ] Overlay meteo sulla mappa
- [ ] Condivisione percorso via link
- [ ] Widget iOS/Android con prossimo percorso
- [ ] Integrazione Strava
- [ ] Heatmap superfici da dati utenti aggregati
