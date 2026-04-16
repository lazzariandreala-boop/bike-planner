<template>
  <div class="relative flex items-center justify-center min-h-full overflow-hidden">
    <!-- Background decorativo -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Linee topografiche animate -->
      <svg class="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%">
            <stop offset="0%" stop-color="#8bb940" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>
        <ellipse cx="50%" cy="50%" rx="400" ry="300" fill="none" stroke="#2a4a2a" stroke-width="1"/>
        <ellipse cx="50%" cy="50%" rx="300" ry="220" fill="none" stroke="#2a4a2a" stroke-width="1"/>
        <ellipse cx="50%" cy="50%" rx="200" ry="145" fill="none" stroke="#3d6b3d" stroke-width="0.8"/>
        <ellipse cx="50%" cy="50%" rx="120" ry="85" fill="none" stroke="#3d6b3d" stroke-width="0.8"/>
        <ellipse cx="50%" cy="50%" rx="60" ry="42" fill="none" stroke="#5a9b5a" stroke-width="1"/>
        <circle cx="50%" cy="50%" r="20" fill="url(#grad1)"/>
      </svg>

      <!-- Glow ambientale -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
        style="background: radial-gradient(circle, rgba(139,185,64,0.08) 0%, transparent 70%); pointer-events: none;"/>
    </div>

    <!-- Card login -->
    <div class="relative z-10 glass-card rounded-2xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
      <!-- Logo/icona -->
      <div class="mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style="background: rgba(139,185,64,0.15); border: 1px solid rgba(139,185,64,0.3);">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <!-- Ruota bici stilizzata -->
            <circle cx="16" cy="16" r="13" stroke="#8bb940" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="3" fill="#8bb940"/>
            <line x1="16" y1="3" x2="16" y2="13" stroke="#8bb940" stroke-width="1.5"/>
            <line x1="16" y1="19" x2="16" y2="29" stroke="#8bb940" stroke-width="1.5"/>
            <line x1="3" y1="16" x2="13" y2="16" stroke="#8bb940" stroke-width="1.5"/>
            <line x1="19" y1="16" x2="29" y2="16" stroke="#8bb940" stroke-width="1.5"/>
            <line x1="7" y1="7" x2="13" y2="13" stroke="#8bb940" stroke-width="1"/>
            <line x1="19" y1="19" x2="25" y2="25" stroke="#8bb940" stroke-width="1"/>
            <line x1="25" y1="7" x2="19" y2="13" stroke="#8bb940" stroke-width="1"/>
            <line x1="13" y1="19" x2="7" y2="25" stroke="#8bb940" stroke-width="1"/>
          </svg>
        </div>

        <h1 class="font-display text-5xl tracking-widest" style="color: #8bb940;">GRAVEL<span style="color: #e8aa3a;">AI</span></h1>
        <p class="text-sm mt-1 font-mono" style="color: #b8cc80; letter-spacing: 0.1em;">ROUTE PLANNER</p>
      </div>

      <!-- Tagline -->
      <p class="text-sm mb-8" style="color: #b8cc80; line-height: 1.6;">
        Percorsi gravel intelligenti.<br>
        Scegli le tue superfici, pensa all'avventura.
      </p>

      <!-- Surface preview chips -->
      <div class="flex flex-wrap justify-center gap-2 mb-8">
        <span class="chip chip-moss text-xs">🚴 Ciclabili</span>
        <span class="chip text-xs" style="background: rgba(168,162,158,0.15); color: #a8a29e; border-color: rgba(168,162,158,0.3);">⚪ Ghiaia</span>
        <span class="chip text-xs" style="background: rgba(146,64,14,0.15); color: #d97706; border-color: rgba(146,64,14,0.3);">🟤 Sterrato</span>
        <span class="chip text-xs" style="background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25);">🌿 Erba</span>
        <span class="chip text-xs" style="background: rgba(55,65,81,0.3); color: #9ca3af; border-color: rgba(55,65,81,0.5);">⚫ Asfalto</span>
      </div>

      <!-- Login button -->
      <button
        class="btn-primary w-full flex items-center justify-center gap-3 py-3 text-base"
        :disabled="loading"
        @click="handleLogin"
      >
        <template v-if="loading">
          <div class="spinner !w-5 !h-5"/>
          <span>Accesso in corso…</span>
        </template>
        <template v-else>
          <!-- Google icon -->
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#1a2e1a"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#1a2e1a"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#1a2e1a"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#1a2e1a"/>
          </svg>
          Continua con Google
        </template>
      </button>

      <p v-if="error" class="text-xs mt-3" style="color: #f87171;">{{ error }}</p>

      <p class="text-xs mt-6" style="color: #3d6b3d;">
        I tuoi percorsi vengono salvati nel tuo account Google.<br>Nessun dato su server di terzi.
      </p>
    </div>

    <!-- Footer tecnico -->
    <div class="absolute bottom-4 left-0 right-0 text-center">
      <p class="font-mono text-xs" style="color: #2a4a2a;">
        POWERED BY OPENROUTESERVICE · FIREBASE · CLAUDE AI
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)

// Redirect se già loggato
watchEffect(() => {
  if (authStore.isLoggedIn) {
    navigateTo('/map')
  }
})

const firebaseErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    'auth/api-key-not-valid': 'Configurazione Firebase non valida. Controlla le variabili d\'ambiente nel file .env.',
    'auth/invalid-api-key': 'Configurazione Firebase non valida. Controlla le variabili d\'ambiente nel file .env.',
    'auth/popup-closed-by-user': 'Accesso annullato.',
    'auth/cancelled-popup-request': '',
    'auth/popup-blocked': 'Il popup è stato bloccato dal browser. Abilita i popup per questo sito.',
    'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
    'auth/unauthorized-domain': 'Dominio non autorizzato in Firebase. Aggiungilo nella console Firebase.',
    'auth/user-disabled': 'Account disabilitato.',
  }
  return messages[code] ?? 'Errore durante il login. Riprova.'
}

const handleLogin = async () => {
  loading.value = true
  error.value = null
  try {
    await authStore.signIn()
    // Su web il popup resolve e poi il watcher fa il redirect
    // Su mobile (redirect flow) il redirect viene gestito in auth store
  } catch (e: any) {
    const code = e.code as string | undefined
    const message = code ? firebaseErrorMessage(code) : (e.message || 'Errore durante il login. Riprova.')
    error.value = message || null
  } finally {
    loading.value = false
  }
}
</script>
