<template>
  <div class="flex flex-col h-full">
    <AppHeader />

    <div class="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6"
      style="padding-bottom: calc(74px + env(safe-area-inset-bottom));">

      <!-- Intestazione -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="font-display text-4xl" style="color: #8bb940;">I MIEI PERCORSI</h1>
          <p class="font-mono text-xs mt-1" style="color: #3d6b3d;">
            {{ routesStore.routes.length }} salvati · {{ routesStore.favoriteRoutes.length }} preferiti
          </p>
        </div>
        <NuxtLink to="/map" class="btn-primary text-sm py-2 px-4 no-underline">
          + Nuovo
        </NuxtLink>
      </div>

      <!-- Filtri -->
      <div class="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button v-for="f in filters" :key="f.value"
          class="chip whitespace-nowrap cursor-pointer transition-all"
          :class="{ 'chip-moss': activeFilter === f.value }"
          @click="activeFilter = f.value">
          {{ f.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="routesStore.loadingRoutes" class="flex justify-center items-center py-16">
        <div class="spinner !w-8 !h-8"/>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredRoutes.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🗺️</div>
        <p class="font-display text-2xl mb-2" style="color: #3d6b3d;">NESSUN PERCORSO</p>
        <p class="text-sm mb-6" style="color: #2a4a2a;">
          {{ activeFilter === 'all' ? 'Pianifica il tuo primo percorso gravel!' : 'Nessun percorso in questa categoria.' }}
        </p>
        <NuxtLink to="/map" class="btn-primary no-underline">Vai alla Mappa</NuxtLink>
      </div>

      <!-- Routes grid -->
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RouteCard
          v-for="route in filteredRoutes"
          :key="route.id"
          :route="route"
          @toggle-favorite="routesStore.toggleFavorite(route.id)"
          @delete="confirmDelete(route)"
          @open="openRoute(route)"
        />
      </div>

    </div>

    <!-- Confirm delete dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal-card">
            <h3 class="font-display text-2xl mb-2" style="color: #ef4444;">ELIMINA PERCORSO</h3>
            <p class="text-sm mb-5" style="color: #b8cc80;">
              Sei sicuro di voler eliminare <strong>"{{ deleteTarget.name }}"</strong>?<br>
              Questa azione non è reversibile.
            </p>
            <div class="flex gap-2">
              <button class="btn-ghost flex-1" @click="deleteTarget = null">Annulla</button>
              <button class="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all cursor-pointer"
                style="background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #fca5a5;"
                @click="doDelete">
                Elimina
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { SavedRoute } from '~/types'
import { useRoutesStore } from '~/stores/routes'

definePageMeta({ middleware: 'auth' })

const routesStore = useRoutesStore()
const router = useRouter()

const activeFilter = ref<'all' | 'favorites' | 'recent'>('all')
const deleteTarget = ref<SavedRoute | null>(null)

const filters = [
  { value: 'all', label: '🗺️ Tutti' },
  { value: 'favorites', label: '⭐ Preferiti' },
  { value: 'recent', label: '🕐 Recenti' },
]

const filteredRoutes = computed(() => {
  if (activeFilter.value === 'favorites') return routesStore.favoriteRoutes
  if (activeFilter.value === 'recent') return routesStore.recentRoutes
  return routesStore.routes
})

onMounted(() => {
  routesStore.fetchRoutes()
})

const openRoute = (route: SavedRoute) => {
  routesStore.setCurrentRoute(route)
  // Imposta partenza e arrivo così i campi in mappa risultano compilati
  if (route.start) routesStore.setStartPoint(route.start)
  if (route.end) routesStore.setEndPoint(route.end)
  router.push('/map')
}

const confirmDelete = (route: SavedRoute) => {
  deleteTarget.value = route
}

const doDelete = async () => {
  if (!deleteTarget.value) return
  await routesStore.deleteRoute(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 16px;
}
.modal-card {
  background: #152415;
  border: 1px solid #2a4a2a;
  border-radius: 16px;
  padding: 24px;
  width: 100%; max-width: 360px;
}
.modal-enter-active, .modal-leave-active { transition: all 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
