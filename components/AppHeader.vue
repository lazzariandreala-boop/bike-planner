<template>
  <!-- Desktop header -->
  <header class="hidden md:flex items-center justify-between px-5 py-0"
    style="background: #0d0f18; border-bottom: 1px solid #1e2130; height: 52px; flex-shrink: 0;">
    <div class="flex items-center gap-4">
      <span class="font-display text-xl tracking-widest" style="color: #a3e635;">
        GRAVEL<span style="color: #f59e0b;">AI</span>
      </span>
      <span style="color: #232640;">|</span>
      <nav class="flex items-center gap-1">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
          class="nav-link" :class="{ 'active': $route.path === item.to }">
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
    <div class="flex items-center gap-3">
      <img v-if="authStore.photoURL" :src="authStore.photoURL" :alt="authStore.displayName"
        class="w-7 h-7 rounded-full" style="border: 2px solid #232640;"/>
      <span class="text-sm" style="color: #8b95a8;">{{ authStore.displayName }}</span>
      <button class="btn-ghost text-xs py-1 px-3" @click="authStore.signOut()">Esci</button>
    </div>
  </header>

  <!-- Mobile bottom nav — always on top -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-[1100] flex items-center justify-around"
    style="
      background: rgba(13,15,24,0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid #1e2130;
      height: calc(58px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
    ">
    <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
      class="mobile-nav-item" :class="{ 'active': $route.path === item.to }">
      <!-- Map icon -->
      <svg v-if="item.icon === 'map'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/>
        <line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
      <!-- Routes icon -->
      <svg v-if="item.icon === 'routes'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18"/>
      </svg>
      <!-- Profile icon -->
      <svg v-if="item.icon === 'profile'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const navItems = [
  { to: '/map',     label: 'Mappa',     icon: 'map'     },
  { to: '/routes',  label: 'Percorsi',  icon: 'routes'  },
  { to: '/profile', label: 'Profilo',   icon: 'profile' },
]
</script>

<style scoped>
.nav-link {
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #404860;
  text-decoration: none;
  transition: all 0.15s;
}
.nav-link:hover { color: #8b95a8; background: #181b2a; }
.nav-link.active { color: #a3e635; background: rgba(163,230,53,0.08); }

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 20px;
  min-height: 44px;
  flex: 1;
  border-radius: 12px;
  text-decoration: none;
  color: #404860;
  font-size: 11px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0.02em;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.mobile-nav-item.active {
  color: #a3e635;
}
.mobile-nav-item.active svg {
  filter: drop-shadow(0 0 6px rgba(163,230,53,0.5));
}
.mobile-nav-item:hover { color: #8b95a8; }
</style>
