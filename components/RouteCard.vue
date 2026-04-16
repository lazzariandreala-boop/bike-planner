<template>
  <div class="route-card rounded-xl overflow-hidden cursor-pointer group transition-all"
    @click="$emit('open')">

    <!-- Header colorato con superfici -->
    <div class="route-card-header px-4 pt-4 pb-3">
      <!-- Surface bar top -->
      <div class="surface-bar mb-3">
        <div v-for="(pct, type) in topSurfaces" :key="type"
          :style="{ background: SURFACE_LABELS[type as SurfaceType]?.color, flex: `${pct} 1 0` }"/>
      </div>

      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h3 class="font-display text-xl leading-tight truncate" style="color: #e8f0d0;">
            {{ route.name }}
          </h3>
          <p class="text-xs mt-1 truncate" style="color: #5a9b5a;">
            {{ route.start?.address?.split(',')[0] }} → {{ route.end?.address?.split(',')[0] }}
          </p>
        </div>

        <!-- Favorite -->
        <button class="flex-shrink-0 p-1 rounded transition-all opacity-60 hover:opacity-100"
          :class="{ '!opacity-100': route.isFavorite }"
          @click.stop="$emit('toggleFavorite')"
          :title="route.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'">
          <svg width="16" height="16" viewBox="0 0 16 16"
            :fill="route.isFavorite ? '#e8aa3a' : 'none'"
            :stroke="route.isFavorite ? '#e8aa3a' : '#5a9b5a'" stroke-width="1.3">
            <path d="M8 1.5l1.9 3.8 4.2.6-3 2.9.7 4.2L8 11l-3.8 2 .7-4.2-3-2.9 4.2-.6L8 1.5z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 divide-x px-0" style="border-top: 1px solid #1e321e; divide-color: #1e321e;">
      <div class="stat-cell">
        <span class="stat-val">{{ distanceLabel }}</span>
        <span class="stat-lbl">km</span>
      </div>
      <div class="stat-cell">
        <span class="stat-val">{{ durationLabel }}</span>
        <span class="stat-lbl">tempo</span>
      </div>
      <div class="stat-cell">
        <span class="stat-val" style="color: #8bb940;">+{{ route.elevation?.gain || 0 }}m</span>
        <span class="stat-lbl">D+</span>
      </div>
    </div>

    <!-- AI Description + footer -->
    <div class="px-4 pb-4 pt-3">
      <p v-if="route.aiDescription" class="text-xs italic mb-3 line-clamp-2"
        style="color: #5a9b5a; line-height: 1.5;">
        "{{ route.aiDescription }}"
      </p>

      <div class="flex items-center justify-between">
        <!-- Tags -->
        <div class="flex gap-1 flex-wrap">
          <span v-for="tag in route.tags?.slice(0, 2)" :key="tag" class="chip text-xs">{{ tag }}</span>
        </div>

        <!-- Date + delete -->
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs" style="color: #2a4a2a;">
            {{ formatDate(route.createdAt) }}
          </span>
          <button class="p-1 opacity-30 hover:opacity-80 transition-opacity"
            style="color: #ef4444;"
            @click.stop="$emit('delete')"
            title="Elimina">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5h3v1M6 6v4M8 6v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              <rect x="3" y="3.5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SavedRoute, SurfaceType } from '~/types'
import { useSurfaceLabels } from '~/composables/useORS'

const SURFACE_LABELS = useSurfaceLabels()

const props = defineProps<{ route: SavedRoute }>()
defineEmits<{ open: []; toggleFavorite: []; delete: [] }>()

const distanceLabel = computed(() => props.route.distance?.toFixed(1) || '—')
const durationLabel = computed(() => {
  const m = props.route.duration
  if (!m) return '—'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h${min > 0 ? min : ''}` : `${min}m`
})

const topSurfaces = computed(() => {
  if (!props.route.surfaceBreakdown) return {}
  return Object.fromEntries(
    Object.entries(props.route.surfaceBreakdown)
      .filter(([, v]) => v > 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  )
})

const formatDate = (d: Date | any) => {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.route-card {
  background: #152415;
  border: 1px solid #1e321e;
  transition: border-color 0.2s, transform 0.15s;
}
.route-card:hover {
  border-color: rgba(139,185,64,0.35);
  transform: translateY(-2px);
}
.route-card-header {
  background: linear-gradient(to bottom, rgba(139,185,64,0.06), transparent);
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(8,15,8,0.4);
}
.stat-val {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  color: #e8f0d0;
  line-height: 1;
}
.stat-lbl {
  font-size: 9px;
  color: #2a4a2a;
  font-family: 'IBM Plex Mono', monospace;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
