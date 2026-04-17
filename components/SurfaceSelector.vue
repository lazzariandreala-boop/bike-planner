<template>
  <div class="surface-selector">
    <p class="text-xs mb-2 font-mono" style="color: #5a9b5a; letter-spacing: 0.08em;">
      SUPERFICI (trascina per priorità)
    </p>

    <draggable
      v-model="localSurfaces"
      item-key="type"
      handle=".drag-icon"
      animation="150"
      ghost-class="surface-ghost"
      class="flex flex-col gap-1"
      @change="onOrderChange"
    >
      <template #item="{ element, index }">
        <div
          class="surface-item flex items-center gap-2 rounded-lg px-3 py-2 cursor-default select-none transition-all"
          :class="{ 'surface-item--active': isActive(element.type) }"
        >
          <!-- Priority badge -->
          <span class="font-mono text-xs w-4 text-center flex-shrink-0"
            :style="{ color: index === 0 ? '#8bb940' : index === 1 ? '#b8cc80' : '#3d6b3d' }">
            {{ index + 1 }}
          </span>

          <!-- Icon -->
          <span class="text-lg flex-shrink-0 select-none">{{ SURFACE_LABELS[element.type as SurfaceType]?.icon }}</span>

          <!-- Label -->
          <span class="text-sm flex-1" :style="{ color: isActive(element.type) ? '#e8f0d0' : '#5a9b5a' }">
            {{ SURFACE_LABELS[element.type as SurfaceType]?.it }}
          </span>

          <!-- Color dot -->
          <span class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ background: SURFACE_LABELS[element.type as SurfaceType]?.color, opacity: isActive(element.type) ? 1 : 0.3 }"/>

          <!-- Toggle -->
          <button
            class="toggle-btn flex-shrink-0"
            :class="{ 'toggle-btn--on': isActive(element.type) }"
            @click="toggle(element.type)"
            :title="isActive(element.type) ? 'Rimuovi' : 'Aggiungi'"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path v-if="isActive(element.type)" d="M3 7h8M7 3v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path v-else d="M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Drag handle -->
          <span class="drag-icon cursor-grab active:cursor-grabbing flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
              <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
              <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
            </svg>
          </span>
        </div>
      </template>
    </draggable>

    <!-- Active surfaces preview bar -->
    <div class="surface-bar mt-3">
      <div v-for="s in activeSurfaces" :key="s"
        :style="{
          background: SURFACE_LABELS[s]?.color,
          flex: `${activeSurfaces.length > 0 ? Math.round(100/activeSurfaces.length) : 0} 1 0`
        }"
        :title="SURFACE_LABELS[s]?.it"
      />
    </div>

    <p v-if="activeSurfaces.length === 0" class="text-xs mt-2" style="color: #f87171;">
      Seleziona almeno una superficie
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SurfaceType, SurfacePreference } from '~/types'
import { useSurfaceLabels } from '~/composables/useORS'

// Dynamic import per evitare SSR issues con vuedraggable
const draggable = defineAsyncComponent(() => import('vuedraggable'))

const SURFACE_LABELS = useSurfaceLabels()

const ALL_SURFACES: SurfaceType[] = [
  'cycleway', 'gravel', 'unpaved', 'dirt', 'grass', 'asphalt', 'concrete', 'cobblestone', 'sand'
]

const props = defineProps<{
  modelValue: SurfaceType[] // ordine di preferenza
}>()

const emit = defineEmits<{
  'update:modelValue': [SurfaceType[]]
}>()

// Lista completa con ordine
const localSurfaces = ref<{ type: SurfaceType }[]>(
  ALL_SURFACES.map(t => ({ type: t }))
    .sort((a, b) => {
      const ia = props.modelValue.indexOf(a.type)
      const ib = props.modelValue.indexOf(b.type)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
)

const activeSurfaces = computed(() => props.modelValue)

const isActive = (type: SurfaceType) => props.modelValue.includes(type)

const toggle = (type: SurfaceType) => {
  const current = [...props.modelValue]
  if (isActive(type)) {
    emit('update:modelValue', current.filter(t => t !== type))
  } else {
    // Aggiungi mantenendo l'ordine del display
    const order = localSurfaces.value.map(s => s.type)
    const newList = order.filter(t => current.includes(t) || t === type)
    emit('update:modelValue', newList)
  }
}

const onOrderChange = () => {
  // Riordina le superfici attive secondo il nuovo ordine
  const order = localSurfaces.value.map(s => s.type)
  const newActive = order.filter(t => isActive(t))
  emit('update:modelValue', newActive)
}

watch(() => props.modelValue, (val) => {
  // Mantieni ordine display quando cambia externally
}, { deep: true })
</script>

<style scoped>
.surface-item {
  background: rgba(26, 46, 26, 0.5);
  border: 1px solid rgba(42, 74, 42, 0.5);
}
.surface-item--active {
  background: rgba(139, 185, 64, 0.08);
  border-color: rgba(139, 185, 64, 0.2);
}
.surface-item:hover {
  background: rgba(42, 74, 42, 0.6);
}
.surface-ghost {
  opacity: 0.3;
  background: rgba(139, 185, 64, 0.2) !important;
}
.toggle-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid #2a4a2a;
  background: transparent;
  color: #3d6b3d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  transform: rotate(45deg);
  flex-shrink: 0;
}
.toggle-btn--on {
  border-color: rgba(139,185,64,0.4);
  color: #8bb940;
  background: rgba(139,185,64,0.1);
  transform: rotate(0deg);
}
.toggle-btn:hover {
  border-color: #8bb940;
  color: #8bb940;
}

@media (max-width: 768px) {
  .surface-item {
    min-height: 52px;
    padding: 10px 12px;
    gap: 10px;
  }
  .toggle-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
  .drag-icon {
    min-width: 36px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }
}
</style>
