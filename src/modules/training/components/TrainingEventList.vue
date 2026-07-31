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
  bookingsLoading?: boolean
  bookingsError?: string
}>()

const emit = defineEmits<{
  select: [event: TrainingEvent]
  retryBookings: []
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
  return result.filter(
    (section) =>
      section.events.length ||
      (section.key === 'upcoming' &&
        (props.bookingsLoading || props.bookingsError)),
  )
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
          <tr v-if="section.key === 'upcoming' && bookingsLoading">
            <td colspan="5" class="py-5!">
              <div class="flex items-center gap-3 text-slate-600">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="20"
                  width="2"
                />
                <span>Loading bookings…</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="section.key === 'upcoming' && bookingsError">
            <td colspan="5" class="py-5!" role="alert">
              <div
                class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p class="font-semibold text-red-700">
                    Bookings could not be loaded
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    {{ bookingsError }}
                  </p>
                </div>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  @click="emit('retryBookings')"
                >
                  Retry
                </v-btn>
              </div>
            </td>
          </tr>
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
        v-if="section.key === 'upcoming' && bookingsLoading"
        class="border-gray-200!"
        rounded="md"
        variant="outlined"
      >
        <v-card-text class="flex items-center gap-3 text-slate-600">
          <v-progress-circular
            indeterminate
            color="primary"
            size="20"
            width="2"
          />
          <span>Loading bookings…</span>
        </v-card-text>
      </v-card>
      <v-card
        v-else-if="section.key === 'upcoming' && bookingsError"
        class="border-gray-200!"
        rounded="md"
        variant="outlined"
        role="alert"
      >
        <v-card-text>
          <p class="font-semibold text-red-700">Bookings could not be loaded</p>
          <p class="mt-1 text-sm text-slate-600">{{ bookingsError }}</p>
          <v-btn
            class="mt-4"
            color="primary"
            variant="outlined"
            size="small"
            @click="emit('retryBookings')"
          >
            Retry
          </v-btn>
        </v-card-text>
      </v-card>
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
