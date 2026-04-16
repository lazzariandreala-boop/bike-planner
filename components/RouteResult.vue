<template>
  <div class="route-result rounded-xl overflow-hidden" style="border: 1px solid rgba(163,230,53,0.15);">
    <!-- Header -->
    <div class="px-4 py-3" style="background: rgba(163,230,53,0.06);">
      <span class="font-mono text-xs" style="color: #a3e635; letter-spacing: 0.08em;">PERCORSO CALCOLATO</span>

      <!-- Stats 2x2 -->
      <div class="grid grid-cols-2 gap-2 mt-2">
        <div class="stat-box">
          <span class="stat-value">{{ distanceLabel }}</span>
          <span class="stat-label">distanza</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">{{ durationLabel }}</span>
          <span class="stat-label">durata · {{ paceName }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">{{ speedLabel }}</span>
          <span class="stat-label">velocità media</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">{{ elevGainLabel }}</span>
          <span class="stat-label">dislivello +</span>
        </div>
      </div>

      <!-- Andatura selector -->
      <div class="mt-3">
        <p class="font-mono text-xs mb-2" style="color: #404860; letter-spacing: 0.08em;">ANDATURA</p>
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="p in paces" :key="p.key"
            class="pace-btn"
            :class="{ 'active': selectedPace === p.key }"
            @click="selectedPace = p.key"
          >
            <span class="pace-icon">{{ p.icon }}</span>
            <span>{{ p.label }}</span>
            <span class="pace-speed">{{ p.speed }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Elevation profile -->
    <div v-if="route.elevation?.profile?.length" class="px-4 py-2" style="background: rgba(13,15,24,0.6);">
      <p class="font-mono text-xs mb-1" style="color: #404860;">PROFILO ALTIMETRICO</p>
      <svg class="w-full" height="50" viewBox="0 0 300 50" preserveAspectRatio="none">
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a3e635" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#a3e635" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <path :d="elevationPath" fill="url(#elevGrad)" stroke="#a3e635" stroke-width="1.5"/>
      </svg>
      <div class="flex justify-between font-mono text-xs mt-1" style="color: #404860;">
        <span>{{ route.elevation.min }}m</span>
        <span>{{ route.elevation.max }}m</span>
      </div>
    </div>

    <!-- Surface breakdown -->
    <div v-if="hasSurfaces" class="px-4 py-2">
      <p class="font-mono text-xs mb-2" style="color: #404860;">SUPERFICI</p>
      <div class="surface-bar mb-2">
        <div v-for="(pct, type) in route.surfaceBreakdown" :key="type"
          :style="{ background: SURFACE_LABELS[type as SurfaceType]?.color, flex: `${pct} 1 0` }"
          :title="`${SURFACE_LABELS[type as SurfaceType]?.it}: ${pct}%`"
        />
      </div>
      <div class="flex flex-wrap gap-1">
        <span v-for="(pct, type) in topSurfaces" :key="type" class="chip text-xs"
          :style="{
            background: `${SURFACE_LABELS[type as SurfaceType]?.color}20`,
            color: SURFACE_LABELS[type as SurfaceType]?.color,
            borderColor: `${SURFACE_LABELS[type as SurfaceType]?.color}40`
          }">
          {{ SURFACE_LABELS[type as SurfaceType]?.icon }} {{ pct }}%
        </span>
      </div>
    </div>

    <!-- AI Description -->
    <div class="px-4 py-3" style="border-top: 1px solid #1e2130;">
      <div class="flex items-center gap-2 mb-2">
        <span class="font-mono text-xs" style="color: #404860;">AI INSIGHT</span>
        <div v-if="isGeneratingAI" class="spinner !w-3 !h-3"/>
      </div>
      <p v-if="route.aiDescription" class="text-xs leading-relaxed italic" style="color: #8b95a8;">
        "{{ route.aiDescription }}"
      </p>
      <p v-else-if="!isGeneratingAI" class="text-xs" style="color: #404860;">
        Generazione descrizione AI…
      </p>
    </div>

    <!-- Azioni -->
    <div class="px-4 py-3 flex gap-2" style="border-top: 1px solid #1e2130;">
      <button class="btn-primary flex-1 py-2 text-sm" @click="$emit('save')">
        <svg width="14" height="14" viewBox="0 0 14 14" class="inline mr-1">
          <path d="M2 2h8l2 2v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2z" stroke="currentColor" fill="none" stroke-width="1.2"/>
          <path d="M4 2v4h6V2" stroke="currentColor" fill="none" stroke-width="1.2"/>
          <rect x="4" y="8" width="6" height="4" rx="0.5" stroke="currentColor" fill="none" stroke-width="1.2"/>
        </svg>
        Salva
      </button>
      <button class="btn-ghost flex-1 py-2 text-sm" @click="$emit('reset')">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SavedRoute, SurfaceType } from '~/types'
import { useSurfaceLabels } from '~/composables/useORS'

const SURFACE_LABELS = useSurfaceLabels()

const props = defineProps<{
  route: Partial<SavedRoute>
  isGeneratingAI: boolean
}>()
defineEmits<{ save: []; reset: [] }>()

// ── Andature ─────────────────────────────────────────────────
// Velocità su piano + penalità salita (min per 100m D+)
// Calibrate su Google Maps "ciclismo veloce" ≈ Hard
// Calibrazione su Google Maps "ciclismo veloce" = Med (~18 min su 4.6km +117m)
const paces = [
  { key: 'easy',   label: 'Easy', icon: '🚶', speed: '~10 km/h', kmh: 10, elevPenalty: 7 },
  { key: 'medium', label: 'Med',  icon: '🚴', speed: '~18 km/h', kmh: 18, elevPenalty: 3 },
  { key: 'hard',   label: 'Hard', icon: '⚡', speed: '~25 km/h', kmh: 25, elevPenalty: 2 },
  { key: 'pro',    label: 'Pro',  icon: '🏆', speed: '~32 km/h', kmh: 32, elevPenalty: 1 },
] as const

type PaceKey = typeof paces[number]['key']

const selectedPace = ref<PaceKey>('medium')

const paceName = computed(() => paces.find(p => p.key === selectedPace.value)?.label ?? '')

// Formula: tempo_piano + penalità_dislivello
// elevPenalty = minuti aggiunti per ogni 100m di D+
const adjustedDuration = computed(() => {
  const dist = props.route.distance   // km
  const gain = props.route.elevation?.gain ?? 0  // m
  if (!dist) return 0
  const pace = paces.find(p => p.key === selectedPace.value)!
  const flatMins   = (dist / pace.kmh) * 60
  const climbMins  = (gain / 100) * pace.elevPenalty
  return Math.round(flatMins + climbMins)
})

// ── Labels ───────────────────────────────────────────────────
const distanceLabel = computed(() => {
  const d = props.route.distance
  return d ? `${d.toFixed(1)} km` : '—'
})

const durationLabel = computed(() => {
  const mins = adjustedDuration.value
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
})

const speedLabel = computed(() => {
  const d = props.route.distance
  const mins = adjustedDuration.value
  if (!d || !mins) return '—'
  const speed = d / (mins / 60)
  return `${speed.toFixed(0)} km/h`
})

const elevGainLabel = computed(() => {
  const g = props.route.elevation?.gain
  return g !== undefined ? `+${g}m` : '—'
})

const hasSurfaces = computed(() =>
  props.route.surfaceBreakdown && Object.keys(props.route.surfaceBreakdown).length > 0
)

const topSurfaces = computed(() => {
  if (!props.route.surfaceBreakdown) return {}
  return Object.fromEntries(
    Object.entries(props.route.surfaceBreakdown)
      .filter(([, v]) => v > 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
  )
})

const elevationPath = computed(() => {
  const profile = props.route.elevation?.profile
  if (!profile || profile.length < 2) return ''
  const maxD = profile[profile.length - 1].distance
  const elevs = profile.map(p => p.elevation)
  const minE = Math.min(...elevs)
  const maxE = Math.max(...elevs)
  const range = maxE - minE || 1
  const toX = (d: number) => (d / maxD) * 300
  const toY = (e: number) => 48 - ((e - minE) / range) * 44
  const pts = profile.map(p => `${toX(p.distance).toFixed(1)},${toY(p.elevation).toFixed(1)}`).join(' L')
  const first = profile[0]
  const last = profile[profile.length - 1]
  return `M ${toX(first.distance).toFixed(1)},50 L${pts} L${toX(last.distance).toFixed(1)},50 Z`
})
</script>

<style scoped>
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(13,15,24,0.7);
  border-radius: 8px;
  border: 1px solid #1e2130;
  gap: 2px;
}
.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 15px;
  font-weight: 500;
  color: #e2eaf5;
  line-height: 1;
}
.stat-label {
  font-size: 10px;
  color: #404860;
  font-family: 'IBM Plex Mono', monospace;
}

.pace-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 8px;
  border: 1px solid #232640;
  background: #181b2a;
  cursor: pointer;
  transition: all 0.15s;
}
.pace-btn:hover { border-color: #5a6490; }
.pace-btn.active {
  border-color: #a3e635;
  background: rgba(163,230,53,0.1);
}
.pace-icon { font-size: 14px; line-height: 1; }
.pace-btn span:nth-child(2) {
  font-size: 11px;
  font-weight: 700;
  color: #8b95a8;
  font-family: 'IBM Plex Mono', monospace;
}
.pace-btn.active span:nth-child(2) { color: #a3e635; }
.pace-speed {
  font-size: 9px;
  color: #404860;
  font-family: 'IBM Plex Mono', monospace;
}
</style>
