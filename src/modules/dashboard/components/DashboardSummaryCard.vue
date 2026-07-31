<script setup lang="ts">
import type { TrainingEvent } from '../../training/events'

defineProps<{
  title: string
  emptyText: string
  events: readonly TrainingEvent[]
  totalEvents: number
  loading?: boolean
  error?: boolean
  to: string
}>()

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}
</script>

<template>
  <v-card class="flex min-h-[25rem] flex-col" rounded="lg" variant="outlined">
    <v-card-title class="flex items-start justify-between gap-4 pa-5 sm:pa-6">
      <span class="text-lg font-semibold whitespace-normal">{{ title }}</span>
      <v-chip
        v-if="!loading"
        color="primary"
        variant="tonal"
        :aria-label="`${totalEvents} total`"
      >
        {{ totalEvents }}
      </v-chip>
      <v-skeleton-loader v-else width="48" type="chip" aria-hidden="true" />
    </v-card-title>

    <v-divider />

    <v-card-text class="flex flex-1 flex-col pa-5 sm:pa-6">
      <v-skeleton-loader
        v-if="loading"
        class="flex-1"
        type="list-item-two-line@5"
        :aria-label="`Loading ${title}`"
      />

      <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
        We could not load this summary. Please try again.
      </v-alert>

      <div
        v-else-if="events.length === 0"
        class="flex flex-1 items-center justify-center text-center text-slate-600"
      >
        <p>{{ emptyText }}</p>
      </div>

      <v-list v-else class="pa-0" lines="two">
        <template v-for="(event, index) in events" :key="event.eventId">
          <v-list-item class="px-0">
            <template #prepend>
              <v-icon
                :icon="
                  event.type === 'booking'
                    ? 'mdi-calendar-clock'
                    : 'mdi-certificate-outline'
                "
                color="primary"
                class="mr-4"
              />
            </template>
            <v-list-item-title class="font-medium">
              {{ event.topicName }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ formatDate(event.relevantDate) }}
              <span
                v-if="event.status === 'overdue'"
                class="ml-2 font-medium text-red-700"
              >
                Overdue
              </span>
            </v-list-item-subtitle>
          </v-list-item>
          <v-divider v-if="index < events.length - 1" />
        </template>
      </v-list>
    </v-card-text>

    <v-card-actions class="px-5 pb-5 sm:px-6 sm:pb-6">
      <v-btn
        color="primary"
        variant="tonal"
        :to="to"
        append-icon="mdi-arrow-right"
      >
        View all
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
