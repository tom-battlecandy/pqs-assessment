<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineEmits<{
  signOut: []
}>()

const route = useRoute()

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Training', to: '/training' },
] as const

const activePath = computed(() =>
  route.path.startsWith('/training') ? '/training' : '/',
)
</script>

<template>
  <div class="min-h-screen bg-pqs-background text-slate-900">
    <a
      href="#main-content"
      class="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-pqs-primary px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
    >
      Skip to main content
    </a>

    <header
      class="hidden border-b border-slate-200 bg-pqs-surface/95 backdrop-blur md:block"
    >
      <div
        class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8"
      >
        <router-link
          to="/"
          class="rounded-md text-lg font-bold tracking-tight text-pqs-primary"
          aria-label="PQS Training Certification dashboard"
        >
          PQS Training Certification
        </router-link>

        <nav class="flex items-center gap-2" aria-label="Primary navigation">
          <v-btn
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :variant="activePath === item.to ? 'tonal' : 'text'"
            color="primary"
            :aria-current="activePath === item.to ? 'page' : undefined"
          >
            {{ item.label }}
          </v-btn>
          <v-btn variant="text" color="secondary" @click="$emit('signOut')">
            Sign out
          </v-btn>
        </nav>
      </div>
    </header>

    <main
      id="main-content"
      class="mx-auto min-h-screen max-w-7xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:min-h-[calc(100vh-4rem)] md:pb-0"
      tabindex="-1"
    >
      <slot />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-pqs-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] md:hidden"
      aria-label="Primary navigation"
    >
      <div class="mx-auto grid h-20 max-w-lg grid-cols-3 items-stretch px-2">
        <v-btn
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          stacked
          :variant="activePath === item.to ? 'tonal' : 'text'"
          color="primary"
          :aria-current="activePath === item.to ? 'page' : undefined"
          class="h-auto"
        >
          {{ item.label }}
        </v-btn>
        <v-btn
          stacked
          variant="text"
          color="secondary"
          class="h-auto"
          @click="$emit('signOut')"
        >
          Sign out
        </v-btn>
      </div>
    </nav>
  </div>
</template>
