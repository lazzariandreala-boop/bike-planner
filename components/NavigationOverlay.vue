<template>
  <div class="nav-overlay">

    <!-- Top bar: close + remaining distance -->
    <div class="nav-topbar">
      <button class="nav-close" @click="$emit('stop')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="nav-progress-bar">
        <div class="nav-progress-fill" :style="{ width: progressPercent + '%' }"/>
      </div>
      <div class="nav-remaining">
        <span class="nav-remaining-dist">{{ remainingKm }}</span>
        <span class="nav-remaining-label">km</span>
      </div>
    </div>

    <!-- Main instruction -->
    <div class="nav-instruction">
      <div class="nav-arrow">
        <component :is="stepArrow(currentStep?.type)" />
      </div>
      <div class="nav-instruction-text">
        <p class="nav-main">{{ currentStep?.instruction || 'Seguire il percorso' }}</p>
        <p class="nav-sub">
          <span v-if="distToTurn !== null" class="nav-dist-badge" :class="distToTurnClass">
            {{ formatDist(distToTurn) }}
          </span>
          <span v-if="currentStep?.name && currentStep.name !== '-'"> — {{ currentStep.name }}</span>
        </p>
      </div>
    </div>

    <!-- Next step preview -->
    <div v-if="nextStep" class="nav-next">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:0.5; flex-shrink:0;">
        <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Poi: {{ nextStep.instruction }}</span>
    </div>

    <!-- Off-route warning -->
    <div v-if="isOffRoute" class="nav-offroute">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1l6 12H1L7 1z" stroke="#f59e0b" fill="none" stroke-width="1.2"/>
        <path d="M7 5v4M7 10.5v.5" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      Fuori percorso
    </div>

  </div>
</template>

<script setup lang="ts">
import type { SavedRoute, ORSSegment, ORSStep } from '~/types'

const props = defineProps<{
  route: Partial<SavedRoute>
}>()

const emit = defineEmits<{
  stop: []
  positionUpdate: [{ lat: number; lng: number; accuracy: number }]
}>()

// ── Stato navigazione ─────────────────────────────────────────
const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)
const nearestIdx   = ref(0)
const currentStepIdx = ref(0)
const isOffRoute  = ref(false)
const announced   = ref(new Set<string>())

let watchId: number | null = null

// ── Tutti gli step in sequenza ────────────────────────────────
const allSteps = computed<ORSStep[]>(() =>
  (props.route.segments ?? []).flatMap(s => s.steps)
)

const coords = computed(() => props.route.geometry?.coordinates ?? [])

const currentStep = computed(() => allSteps.value[currentStepIdx.value] ?? null)
const nextStep    = computed(() => allSteps.value[currentStepIdx.value + 1] ?? null)

// ── Distanza al prossimo waypoint dello step ──────────────────
const distToTurn = computed<number | null>(() => {
  if (userLat.value === null || !currentStep.value) return null
  const endIdx = currentStep.value.way_points[1]
  let dist = 0
  for (let i = nearestIdx.value; i < endIdx && i < coords.value.length - 1; i++) {
    dist += haversine(coords.value[i][1], coords.value[i][0], coords.value[i + 1][1], coords.value[i + 1][0])
  }
  return Math.round(dist)
})

const distToTurnClass = computed(() => {
  if (distToTurn.value === null) return ''
  if (distToTurn.value < 50)  return 'dist-imminent'
  if (distToTurn.value < 150) return 'dist-soon'
  return ''
})

// ── Distanza rimanente ────────────────────────────────────────
const remainingKm = computed(() => {
  if (userLat.value === null) return props.route.distance?.toFixed(1) ?? '—'
  let dist = 0
  for (let i = nearestIdx.value; i < coords.value.length - 1; i++) {
    dist += haversine(coords.value[i][1], coords.value[i][0], coords.value[i + 1][1], coords.value[i + 1][0])
  }
  return (dist / 1000).toFixed(1)
})

const progressPercent = computed(() => {
  const total = (props.route.distance ?? 0) * 1000
  if (!total) return 0
  const done = total - parseFloat(remainingKm.value) * 1000
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
})

// ── Avvio navigazione ─────────────────────────────────────────
onMounted(() => {
  speak('Navigazione avviata. ' + (currentStep.value?.instruction ?? ''))

  if (!navigator.geolocation) {
    console.warn('[Nav] Geolocation non supportata')
    return
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => onPosition(pos),
    (err) => console.warn('[Nav] GPS error', err),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  )
})

onUnmounted(() => {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  speechSynthesis.cancel()
})

// ── Aggiornamento posizione ───────────────────────────────────
const onPosition = (pos: GeolocationPosition) => {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords
  userLat.value = lat
  userLng.value = lng

  emit('positionUpdate', { lat, lng, accuracy })

  // Nearest point on route
  const { idx, dist } = findNearest(lat, lng)
  nearestIdx.value = idx

  // Off-route se > 80m dal tracciato
  isOffRoute.value = dist > 80

  // Aggiorna step corrente
  updateStep(idx)

  // Controllo arrivo
  const endCoord = coords.value[coords.value.length - 1]
  if (endCoord) {
    const distToEnd = haversine(lat, lng, endCoord[1], endCoord[0])
    if (distToEnd < 30) {
      speakOnce('arrived', 'Sei arrivato a destinazione!')
    }
  }

  // Annuncio imminente svolta
  if (distToTurn.value !== null && distToTurn.value < 150 && distToTurn.value > 10) {
    const key = `turn-${currentStepIdx.value}`
    speakOnce(key, `Tra ${formatDist(distToTurn.value)}, ${currentStep.value?.instruction}`)
  }
}

const updateStep = (posIdx: number) => {
  const steps = allSteps.value
  let newIdx = 0
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].way_points[0] <= posIdx) { newIdx = i; break }
  }
  if (newIdx !== currentStepIdx.value) {
    currentStepIdx.value = newIdx
    speakOnce(`step-${newIdx}`, steps[newIdx]?.instruction ?? '')
  }
}

// ── Helpers ───────────────────────────────────────────────────
const findNearest = (lat: number, lng: number) => {
  let minDist = Infinity, idx = 0
  for (let i = 0; i < coords.value.length; i++) {
    const d = haversine(lat, lng, coords.value[i][1], coords.value[i][0])
    if (d < minDist) { minDist = d; idx = i }
  }
  return { idx, dist: minDist }
}

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'it-IT'
  u.rate = 0.95
  u.volume = 1
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

const speakOnce = (key: string, text: string) => {
  if (announced.value.has(key) || !text) return
  announced.value.add(key)
  speak(text)
}

// ── Icone freccia per tipo ORS ────────────────────────────────
// ORS step types: 0=left, 1=right, 2=sharp-left, 3=sharp-right,
// 4=slight-left, 5=slight-right, 6=straight, 7=roundabout,
// 10=destination, 11=depart, 12=keep-left, 13=keep-right
const stepArrow = (type: number | undefined) => {
  return defineComponent({
    render() {
      const t = type ?? 6
      // Default: straight arrow
      let path = 'M9 14V4M5 8l4-4 4 4' // up arrow (straight)

      if (t === 0 || t === 2 || t === 12)      path = 'M14 9H4M8 5l-4 4 4 4' // left
      else if (t === 1 || t === 3 || t === 13) path = 'M4 9h10M10 5l4 4-4 4' // right
      else if (t === 4)                        path = 'M13 13L4 4M4 4h6M4 4v6' // slight left (up-left)
      else if (t === 5)                        path = 'M5 13L14 4M14 4H8M14 4v6' // slight right (up-right)
      else if (t === 7)                        path = 'M9 4a5 5 0 1 1 0 10' // roundabout arc
      else if (t === 10)                       path = 'M9 2l7 7-7 7M4 9h12' // destination (flag)
      else if (t === 11)                       path = 'M4 9h10M10 5l4 4-4 4' // depart

      return h('svg', { width: 36, height: 36, viewBox: '0 0 18 18', fill: 'none' }, [
        h('path', { d: path, stroke: '#a3e635', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      ])
    }
  })
}
</script>

<style scoped>
.nav-overlay {
  position: fixed;
  left: 0; right: 0;
  bottom: calc(58px + env(safe-area-inset-bottom));
  z-index: 3000;
  background: #0a0c14;
  border-top: 1px solid #1e2130;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Desktop: floating card bottom-right, non copre la sidebar */
@media (min-width: 769px) {
  .nav-overlay {
    left: auto;
    right: 24px;
    bottom: 24px;
    width: 360px;
    border-radius: 16px;
    border: 1px solid #1e2130;
  }
}

/* ── Top bar ─────────────────────────────────────────────── */
.nav-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 8px;
}
.nav-close {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid #232640;
  background: #181b2a;
  color: #8b95a8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.nav-close:active { background: #232640; }

.nav-progress-bar {
  flex: 1;
  height: 4px;
  background: #1e2130;
  border-radius: 2px;
  overflow: hidden;
}
.nav-progress-fill {
  height: 100%;
  background: #a3e635;
  border-radius: 2px;
  transition: width 1s ease;
}
.nav-remaining {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}
.nav-remaining-dist {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #e2eaf5;
}
.nav-remaining-label {
  font-size: 11px;
  color: #404860;
  font-family: 'IBM Plex Mono', monospace;
}

/* ── Main instruction ────────────────────────────────────── */
.nav-instruction {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px 12px;
  border-top: 1px solid #0f1119;
}
.nav-arrow {
  flex-shrink: 0;
  width: 44px; height: 44px;
  background: rgba(163,230,53,0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.nav-instruction-text { flex: 1; min-width: 0; }
.nav-main {
  font-size: 15px;
  font-weight: 600;
  color: #e2eaf5;
  line-height: 1.3;
}
.nav-sub {
  font-size: 12px;
  color: #5a6490;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.nav-dist-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #a3e635;
  background: rgba(163,230,53,0.1);
  border-radius: 4px;
  padding: 1px 6px;
}
.nav-dist-badge.dist-soon     { color: #f59e0b; background: rgba(245,158,11,0.1); }
.nav-dist-badge.dist-imminent { color: #ef4444; background: rgba(239,68,68,0.15); animation: pulse 0.8s ease infinite; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* ── Next step ───────────────────────────────────────────── */
.nav-next {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 10px;
  border-top: 1px solid #0f1119;
  font-size: 12px;
  color: #404860;
  line-height: 1.3;
}

/* ── Off-route ───────────────────────────────────────────── */
.nav-offroute {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245,158,11,0.08);
  border-top: 1px solid rgba(245,158,11,0.15);
}
</style>
