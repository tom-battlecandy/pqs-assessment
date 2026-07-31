<script setup lang="ts">
import { onMounted, ref } from 'vue'

const apiStatus = ref('Checking API…')

onMounted(async () => {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const health = (await response.json()) as { status: string }
    apiStatus.value =
      health.status === 'ok' ? 'API connected' : 'API unavailable'
  } catch {
    apiStatus.value = 'API unavailable'
  }
})
</script>

<template>
  <v-app>
    <v-main class="bg-slate-50">
      <router-view v-slot="{ Component }">
        <component :is="Component" :api-status="apiStatus" />
      </router-view>
    </v-main>
  </v-app>
</template>
