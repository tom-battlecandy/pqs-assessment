<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'

import { signOut } from '@/modules/account/api'
import AppShell from '@/shared/components/AppShell.vue'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const online = ref(navigator.onLine)
const signingOut = ref(false)
const signOutError = ref('')
const authenticatedLayout = computed(() => route.meta.requiresAuth === true)

function updateOnlineStatus() {
  online.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

async function handleSignOut() {
  if (signingOut.value) return
  signingOut.value = true
  signOutError.value = ''
  try {
    await signOut(queryClient)
    await router.replace('/')
  } catch {
    signOutError.value = online.value
      ? 'Sign out failed. Please try again.'
      : 'You are offline. Reconnect before signing out.'
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <v-app>
    <v-alert
      v-if="!online"
      type="warning"
      variant="flat"
      density="compact"
      class="rounded-0"
      role="status"
    >
      You are offline. Saved account and training data may be shown, but changes
      require a connection.
    </v-alert>
    <v-alert
      v-if="signOutError"
      type="error"
      variant="tonal"
      closable
      class="ma-4"
      role="alert"
      @click:close="signOutError = ''"
    >
      {{ signOutError }}
    </v-alert>

    <AppShell v-if="authenticatedLayout" @sign-out="handleSignOut">
      <router-view />
    </AppShell>
    <router-view v-else />
  </v-app>
</template>
