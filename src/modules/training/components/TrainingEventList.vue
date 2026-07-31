<script setup lang="ts">
import { computed } from 'vue'

import type {
  TrainingEvent,
  TrainingEventSection,
  TrainingEventStatus,
} from '../events'

const props = defineProps<{
  events: TrainingEvent[]
  includeArchived: boolean
}>()

const emit = defineEmits<{
  select: [event: TrainingEvent]
}>()

const sections = computed(() => {
  const result: {
    key: TrainingEventSection
    label: string
    events: TrainingEvent[]
  }[] = [
    {
      key: 'upcoming',
      label: 'Upcoming',
      events: props.events.filter((event) => event.section === 'upcoming'),
    },
  ]
  if (props.includeArchived) {
    result.push({
      key: 'archive',
      label: 'Archive',
      events: props.events.filter((event) => event.section === 'archive'),
    })
  }
  return result.filter((section) => section.events.length)
})

const statusColors: Record<TrainingEventStatus, string> = {
  open: 'info',
  overdue: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  awarded: 'success',
  expired: 'error',
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}
</script>

<template>
  <section
    v-for="section in sections"
    :key="section.key"
    class="mb-8"
    :aria-labelledby="`${section.key}-heading`"
  >
    <h2 :id="`${section.key}-heading`" class="mb-3 text-xl font-semibold">
      {{ section.label }}
    </h2>

    <v-card
      class="hidden border-gray-200! md:block"
      rounded="md"
      variant="outlined"
    >
      <v-table>
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">Event</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in section.events" :key="event.eventId">
            <td class="font-medium">{{ event.topicName }}</td>
            <td>{{ formatLabel(event.type) }}</td>
            <td>{{ formatDate(event.relevantDate) }}</td>
            <td>
              <v-chip
                :color="statusColors[event.status]"
                size="small"
                variant="tonal"
              >
                {{ formatLabel(event.status) }}
              </v-chip>
            </td>
            <td class="text-right">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                :aria-label="`Edit ${event.topicName} ${event.type}`"
                @click="emit('select', event)"
              >
                Edit
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <div class="grid gap-3 md:hidden">
      <v-card
        v-for="event in section.events"
        :key="event.eventId"
        class="border-gray-200!"
        rounded="md"
        variant="outlined"
      >
        <v-card-text class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="truncate font-semibold">{{ event.topicName }}</p>
            <p class="mt-1 text-sm text-slate-600">
              {{ formatLabel(event.type) }} ·
              {{ formatDate(event.relevantDate) }}
            </p>
            <v-chip
              class="mt-3"
              :color="statusColors[event.status]"
              size="small"
              variant="tonal"
            >
              {{ formatLabel(event.status) }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="text"
            color="primary"
            :aria-label="`Edit ${event.topicName} ${event.type}`"
            @click="emit('select', event)"
          >
            Edit
          </v-btn>
        </v-card-text>
      </v-card>
    </div>
  </section>
</template>
