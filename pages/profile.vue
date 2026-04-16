<template>
  <div class="flex flex-col h-full">
    <AppHeader />

    <div class="flex-1 overflow-y-auto px-4 py-6 md:px-8"
      style="padding-bottom: calc(74px + env(safe-area-inset-bottom));">

      <div class="max-w-lg mx-auto space-y-6">

        <!-- User card -->
        <div class="glass-card rounded-2xl p-6 flex items-center gap-4">
          <img v-if="authStore.photoURL" :src="authStore.photoURL" :alt="authStore.displayName"
            class="w-16 h-16 rounded-full border-2" style="border-color: #8bb940;"/>
          <div v-else class="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style="background: #1e321e; border: 2px solid #2a4a2a;">🚴</div>

          <div>
            <h2 class="font-display text-2xl" style="color: #e8f0d0;">{{ authStore.displayName }}</h2>
            <p class="text-sm" style="color: #5a9b5a;">{{ authStore.user?.email }}</p>
            <div class="flex gap-2 mt-2">
              <span class="chip chip-moss text-xs">{{ routesStore.routes.length }} percorsi</span>
              <span class="chip chip-amber text-xs">{{ totalKm }} km totali</span>
            </div>
          </div>
        </div>

        <!-- Preferenze superfici default -->
        <div class="glass-card rounded-xl p-5">
          <h3 class="font-display text-xl mb-1" style="color: #8bb940;">SUPERFICI DEFAULT</h3>
          <p class="text-xs mb-4" style="color: #3d6b3d;">
            Ordine usato come default quando pianifichi un nuovo percorso
          </p>
          <SurfaceSelector v-model="localSurfaces" />
          <button class="btn-primary w-full mt-4 py-2 text-sm" @click="saveSurfaces" :disabled="savingPrefs">
            <div v-if="savingPrefs" class="spinner !w-4 !h-4 inline-block mr-1"/> Salva preferenze
          </button>
        </div>

        <!-- Statistiche -->
        <div class="glass-card rounded-xl p-5">
          <h3 class="font-display text-xl mb-4" style="color: #8bb940;">STATISTICHE</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="stat-block">
              <span class="font-mono text-2xl" style="color: #e8f0d0;">{{ routesStore.routes.length }}</span>
              <span class="text-xs" style="color: #3d6b3d;">Percorsi salvati</span>
            </div>
            <div class="stat-block">
              <span class="font-mono text-2xl" style="color: #e8f0d0;">{{ totalKm }}</span>
              <span class="text-xs" style="color: #3d6b3d;">Km pianificati</span>
            </div>
            <div class="stat-block">
              <span class="font-mono text-2xl" style="color: #8bb940;">{{ totalElevation }}</span>
              <span class="text-xs" style="color: #3d6b3d;">Metri D+ totali</span>
            </div>
            <div class="stat-block">
              <span class="font-mono text-2xl" style="color: #e8aa3a;">{{ routesStore.favoriteRoutes.length }}</span>
              <span class="text-xs" style="color: #3d6b3d;">Percorsi preferiti</span>
            </div>
          </div>
        </div>

        <!-- Zona pericolosa -->
        <div class="rounded-xl p-5" style="border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05);">
          <h3 class="font-display text-xl mb-3" style="color: #ef4444;">ACCOUNT</h3>
          <button class="btn-ghost w-full py-2 text-sm" style="border-color: rgba(239,68,68,0.3); color: #fca5a5;"
            @click="authStore.signOut()">
            Disconnetti account Google
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SurfaceType } from '~/types'
import { useAuthStore } from '~/stores/auth'
import { useRoutesStore } from '~/stores/routes'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const routesStore = useRoutesStore()

const localSurfaces = ref<SurfaceType[]>(
  authStore.profile?.preferences?.defaultSurfaces || ['cycleway', 'gravel', 'unpaved', 'asphalt']
)
const savingPrefs = ref(false)

onMounted(() => {
  routesStore.fetchRoutes()
})

const totalKm = computed(() =>
  Math.round(routesStore.routes.reduce((a, r) => a + (r.distance || 0), 0))
)

const totalElevation = computed(() =>
  Math.round(routesStore.routes.reduce((a, r) => a + (r.elevation?.gain || 0), 0))
)

const saveSurfaces = async () => {
  savingPrefs.value = true
  await authStore.updatePreferences({ defaultSurfaces: localSurfaces.value })
  savingPrefs.value = false
}

watch(() => authStore.profile?.preferences?.defaultSurfaces, (val) => {
  if (val) localSurfaces.value = val
})
</script>

<style scoped>
.stat-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(8,15,8,0.5);
  border-radius: 8px;
  border: 1px solid #1e321e;
}
</style>
