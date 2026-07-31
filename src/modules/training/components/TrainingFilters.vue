<script setup lang="ts">
import type { Topic } from '../../../../shared/contracts/training'
import type { TrainingEventListOptions, TrainingEventType } from '../events'

defineProps<{
  filters: TrainingEventListOptions
  topics: Topic[]
}>()

const emit = defineEmits<{
  change: [
    key:
      | 'topic'
      | 'type'
      | 'from'
      | 'to'
      | 'includeArchived'
      | 'includeFutureExpirations',
    value: number | TrainingEventType | string | boolean | undefined,
  ]
  clear: []
}>()

const eventTypes = [
  { title: 'All event types', value: undefined },
  { title: 'Bookings', value: 'booking' },
  { title: 'Certifications', value: 'certification' },
  { title: 'Expirations', value: 'expiration' },
] as const
</script>

<template>
  <v-card class="border-gray-200!" rounded="md" variant="outlined">
    <v-card-title class="px-5 pt-5 text-h6">Filters</v-card-title>
    <v-card-text class="grid gap-x-4 pb-2 sm:grid-cols-2 lg:grid-cols-4">
      <v-select
        :model-value="filters.topic"
        :items="[{ name: 'All topics', id: undefined }, ...topics]"
        item-title="name"
        item-value="id"
        label="Topic"
        clearable
        hide-details="auto"
        @update:model-value="emit('change', 'topic', $event ?? undefined)"
      />
      <v-select
        :model-value="filters.type"
        :items="eventTypes"
        label="Event type"
        hide-details="auto"
        @update:model-value="emit('change', 'type', $event)"
      />
      <v-text-field
        :model-value="filters.from"
        label="From date"
        type="date"
        hide-details="auto"
        @update:model-value="emit('change', 'from', $event || undefined)"
      />
      <v-text-field
        :model-value="filters.to"
        label="To date"
        type="date"
        hide-details="auto"
        @update:model-value="emit('change', 'to', $event || undefined)"
      />
      <v-checkbox
        :model-value="filters.includeArchived"
        label="Show archive"
        color="primary"
        hide-details
        @update:model-value="emit('change', 'includeArchived', Boolean($event))"
      />
      <v-checkbox
        :model-value="filters.includeFutureExpirations"
        label="Show expirations beyond 90 days"
        color="primary"
        hide-details
        @update:model-value="
          emit('change', 'includeFutureExpirations', Boolean($event))
        "
      />
    </v-card-text>
    <v-card-actions class="px-5 pb-5">
      <v-btn variant="text" color="secondary" @click="emit('clear')">
        Clear filters
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
