<script setup lang="ts">
defineProps<{ apiStatus: string }>()
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
    <v-card class="w-100" rounded="lg" elevation="2">
      <v-card-title class="text-h4">PQS Training Certification</v-card-title>
      <v-card-text>
        <p class="mb-4 text-slate-600">
          Manage your personal training bookings and certifications.
        </p>
        <v-chip color="primary" variant="tonal">{{ apiStatus }}</v-chip>
      </v-card-text>
    </v-card>
  </main>
</template>
