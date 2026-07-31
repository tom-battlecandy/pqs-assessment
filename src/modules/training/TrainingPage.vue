<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

import type {
  Booking,
  IsoDate,
  TrainingRecord,
} from '../../../shared/contracts/training'
import { trainingDataQueryOptions, TrainingApiError } from './api'
import {
  buildTrainingEventList,
  parseTrainingEventQuery,
  type TrainingEvent,
  type TrainingEventType,
} from './events'
import BookingDialog from './components/BookingDialog.vue'
import CertificationDialog from './components/CertificationDialog.vue'
import TrainingEventList from './components/TrainingEventList.vue'
import TrainingFilters from './components/TrainingFilters.vue'

const route = useRoute()
const router = useRouter()
const trainingQuery = useQuery(trainingDataQueryOptions())

const bookingOpen = ref(false)
const certificationOpen = ref(false)
const selectedBooking = ref<Booking>()
const selectedRecord = ref<TrainingRecord>()
const quickCreate = ref<{
  topicId: number
  awardedAt: IsoDate
}>()
const returnFocus = ref<HTMLElement | null>(null)

const today = computed<IsoDate>(() => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as IsoDate
})
const filters = computed(() => parseTrainingEventQuery(route.query))
const eventPage = computed(() =>
  trainingQuery.data.value
    ? buildTrainingEventList(
        trainingQuery.data.value,
        today.value,
        filters.value,
      )
    : undefined,
)
const topics = computed(() => trainingQuery.data.value?.topics ?? [])
const queryError = computed(() =>
  trainingQuery.error.value instanceof TrainingApiError
    ? trainingQuery.error.value.message
    : 'Training data could not be loaded.',
)
const anyDialogOpen = computed(
  () => bookingOpen.value || certificationOpen.value,
)

watch(anyDialogOpen, async (open, wasOpen) => {
  if (!open && wasOpen) {
    await nextTick()
    returnFocus.value?.focus()
    returnFocus.value = null
  }
})

watch(
  () => eventPage.value?.page,
  (page) => {
    if (page !== undefined && page !== filters.value.page) {
      void setQueryValue('page', page)
    }
  },
)

function rememberFocus() {
  returnFocus.value =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
}

function openBooking(booking?: Booking) {
  rememberFocus()
  selectedBooking.value = booking
  bookingOpen.value = true
}

function openCertification(record?: TrainingRecord) {
  rememberFocus()
  selectedRecord.value = record
  quickCreate.value = undefined
  certificationOpen.value = true
}

function selectEvent(event: TrainingEvent) {
  if (event.sourceType === 'booking') {
    openBooking(
      trainingQuery.data.value?.bookings.find(
        (booking) => booking.id === event.sourceId,
      ),
    )
    return
  }

  openCertification(
    trainingQuery.data.value?.trainingRecords.find(
      (record) => record.id === event.sourceId,
    ),
  )
}

function bookingCompleted(booking: Booking) {
  quickCreate.value = {
    topicId: booking.topicId,
    awardedAt: booking.completedAt as IsoDate,
  }
  selectedRecord.value = undefined
  bookingOpen.value = false
  certificationOpen.value = true
}

function cleanQuery(): LocationQueryRaw {
  return Object.fromEntries(
    Object.entries(route.query).filter(([, value]) => value !== undefined),
  )
}

function setQueryValue(
  key: string,
  value: string | number | boolean | undefined,
  resetPage = false,
) {
  const query = cleanQuery()
  if (
    value === undefined ||
    value === false ||
    value === '' ||
    (key === 'page' && value === 1) ||
    (key === 'pageSize' && value === 20)
  ) {
    delete query[key]
  } else {
    query[key] = String(value)
  }
  if (resetPage) delete query.page
  return router.replace({ query })
}

function changeFilter(
  key:
    | 'topic'
    | 'type'
    | 'from'
    | 'to'
    | 'includeArchived'
    | 'includeFutureExpirations',
  value: number | TrainingEventType | string | boolean | undefined,
) {
  void setQueryValue(key, value, true)
}

function removeFilter(key: string) {
  if (
    key === 'topic' ||
    key === 'type' ||
    key === 'from' ||
    key === 'to' ||
    key === 'includeArchived' ||
    key === 'includeFutureExpirations'
  ) {
    changeFilter(key, undefined)
  }
}

function clearFilters() {
  const query = cleanQuery()
  for (const key of [
    'topic',
    'type',
    'from',
    'to',
    'includeArchived',
    'includeFutureExpirations',
    'page',
  ]) {
    delete query[key]
  }
  void router.replace({ query })
}

const activeFilters = computed(() => {
  const active: { key: string; label: string }[] = []
  if (filters.value.topic !== undefined) {
    const topic = topics.value.find((item) => item.id === filters.value.topic)
    active.push({
      key: 'topic',
      label: `Topic: ${topic?.name ?? filters.value.topic}`,
    })
  }
  if (filters.value.type) {
    active.push({ key: 'type', label: `Type: ${filters.value.type}` })
  }
  if (filters.value.from) {
    active.push({ key: 'from', label: `From: ${filters.value.from}` })
  }
  if (filters.value.to) {
    active.push({ key: 'to', label: `To: ${filters.value.to}` })
  }
  if (filters.value.includeArchived) {
    active.push({ key: 'includeArchived', label: 'Archive shown' })
  }
  if (filters.value.includeFutureExpirations) {
    active.push({
      key: 'includeFutureExpirations',
      label: 'Future expirations shown',
    })
  }
  return active
})
</script>

<template>
  <div class="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    <header
      class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Training</h1>
        <p class="mt-1 text-slate-600">
          Manage bookings, certifications and upcoming expirations.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <v-btn color="primary" variant="tonal" @click="openBooking()">
          Add booking
        </v-btn>
        <v-btn color="primary" variant="flat" @click="openCertification()">
          Add certification
        </v-btn>
      </div>
    </header>

    <template v-if="trainingQuery.isPending.value">
      <v-skeleton-loader class="mb-6" type="article" rounded="xl" />
      <v-skeleton-loader
        type="table-heading, table-thead, table-row@6"
        rounded="xl"
      />
    </template>

    <v-alert
      v-else-if="trainingQuery.isError.value"
      type="error"
      variant="tonal"
      title="Unable to load training"
      class="mb-6"
    >
      <p>{{ queryError }}</p>
      <v-btn class="mt-3" variant="outlined" @click="trainingQuery.refetch()">
        Try again
      </v-btn>
    </v-alert>

    <template v-else-if="eventPage">
      <TrainingFilters
        class="mb-4"
        :filters="filters"
        :topics="topics"
        @change="changeFilter"
        @clear="clearFilters"
      />

      <div
        v-if="activeFilters.length"
        class="mb-6 flex flex-wrap items-center gap-2"
        aria-label="Active filters"
      >
        <span class="text-sm font-medium text-slate-600">Active:</span>
        <v-chip
          v-for="filter in activeFilters"
          :key="filter.key"
          closable
          color="primary"
          variant="tonal"
          @click:close="removeFilter(filter.key)"
        >
          {{ filter.label }}
        </v-chip>
      </div>

      <v-alert
        v-if="eventPage.totalEvents === 0"
        type="info"
        variant="tonal"
        title="No training events"
        class="mb-6"
      >
        {{
          activeFilters.length
            ? 'No events match the active filters.'
            : 'Add a booking or certification to get started.'
        }}
      </v-alert>

      <TrainingEventList
        v-else
        :events="eventPage.events"
        :include-archived="filters.includeArchived ?? false"
        @select="selectEvent"
      />

      <footer
        v-if="eventPage.totalEvents > 0"
        class="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row"
      >
        <p class="text-sm text-slate-600">
          {{ eventPage.totalEvents }} event{{
            eventPage.totalEvents === 1 ? '' : 's'
          }}
        </p>
        <div class="flex items-center gap-3">
          <v-select
            :model-value="eventPage.pageSize"
            :items="[20, 50, 100]"
            label="Rows"
            density="compact"
            hide-details
            class="w-28"
            @update:model-value="setQueryValue('pageSize', $event, true)"
          />
          <v-pagination
            :model-value="eventPage.page"
            :length="eventPage.totalPages"
            :total-visible="5"
            density="comfortable"
            @update:model-value="setQueryValue('page', $event)"
          />
        </div>
      </footer>
    </template>

    <BookingDialog
      v-model="bookingOpen"
      :topics="topics"
      :booking="selectedBooking"
      @completed="bookingCompleted"
    />
    <CertificationDialog
      v-model="certificationOpen"
      :topics="topics"
      :training-record="selectedRecord"
      :initial-topic-id="quickCreate?.topicId"
      :initial-awarded-at="quickCreate?.awardedAt"
      :quick-create="quickCreate !== undefined"
      @update:model-value="!$event && (quickCreate = undefined)"
    />
  </div>
</template>
