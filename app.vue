<template>
  <div class="h-full w-full topo-bg">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Inizializza Firebase Auth listener all'avvio
onMounted(() => {
  authStore.init()
})
</script>
