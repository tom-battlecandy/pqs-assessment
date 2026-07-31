<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type {
  Booking,
  IsoDate,
  Topic,
} from '../../../../shared/contracts/training'
import {
  cancelBookingMutationOptions,
  completeBookingMutationOptions,
  createBookingMutationOptions,
  TrainingApiError,
  updateBookingMutationOptions,
} from '../api'

const props = defineProps<{
  modelValue: boolean
  topics: Topic[]
  booking?: Booking
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  completed: [booking: Booking]
  saved: []
}>()

const queryClient = useQueryClient()
const createMutation = useMutation(createBookingMutationOptions(queryClient))
const updateMutation = useMutation(updateBookingMutationOptions(queryClient))
const completeMutation = useMutation(
  completeBookingMutationOptions(queryClient),
)
const cancelMutation = useMutation(cancelBookingMutationOptions(queryClient))

const topicId = ref<number | null>(null)
const commencingAt = ref('')
const localError = ref('')
const confirmAction = ref<'complete' | 'cancel' | null>(null)

const editing = computed(() => props.booking !== undefined)
const isOpen = computed(
  () =>
    props.booking === undefined ||
    (props.booking.completedAt === null && props.booking.cancelledAt === null),
)
const pending = computed(
  () =>
    createMutation.isPending.value ||
    updateMutation.isPending.value ||
    completeMutation.isPending.value ||
    cancelMutation.isPending.value,
)
const mutationError = computed(() => {
  const error =
    createMutation.error.value ??
    updateMutation.error.value ??
    completeMutation.error.value ??
    cancelMutation.error.value
  return error instanceof TrainingApiError ? error : null
})
const errorMessage = computed(
  () => localError.value || mutationError.value?.message || '',
)

function reset() {
  topicId.value = props.booking?.topicId ?? null
  commencingAt.value = props.booking?.commencingAt ?? ''
  localError.value = ''
  confirmAction.value = null
  createMutation.reset()
  updateMutation.reset()
  completeMutation.reset()
  cancelMutation.reset()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)

function close() {
  if (!pending.value) emit('update:modelValue', false)
}

async function save() {
  localError.value = ''
  if (topicId.value === null || !commencingAt.value) {
    localError.value = 'Choose a topic and commencing date.'
    return
  }

  const input = {
    topicId: topicId.value,
    commencingAt: commencingAt.value as IsoDate,
  }

  try {
    if (props.booking) {
      await updateMutation.mutateAsync({ id: props.booking.id, input })
    } else {
      await createMutation.mutateAsync(input)
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    // Mutation state renders the API error.
  }
}

async function runConfirmedAction() {
  if (!props.booking || !confirmAction.value) return

  try {
    if (confirmAction.value === 'complete') {
      const completed = await completeMutation.mutateAsync(props.booking.id)
      emit('completed', completed)
    } else {
      await cancelMutation.mutateAsync(props.booking.id)
      emit('saved')
    }
    confirmAction.value = null
    emit('update:modelValue', false)
  } catch {
    confirmAction.value = null
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    :persistent="pending"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl">
      <v-card-title class="px-6 pt-6 text-h5">
        {{ editing ? 'Edit booking' : 'Add booking' }}
      </v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="errorMessage"
          class="mb-4"
          type="error"
          variant="tonal"
          density="compact"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form id="booking-form" @submit.prevent="save">
          <v-select
            v-model="topicId"
            :items="topics"
            item-title="name"
            item-value="id"
            label="Topic"
            :error-messages="mutationError?.fieldErrors.topicId"
            required
            autofocus
          />
          <v-text-field
            v-model="commencingAt"
            label="Commencing date"
            type="date"
            :error-messages="mutationError?.fieldErrors.commencingAt"
            required
          />
        </v-form>

        <v-alert
          v-if="editing && !isOpen"
          type="info"
          variant="tonal"
          density="compact"
        >
          This booking is archived. Its topic and commencing date can still be
          updated.
        </v-alert>
      </v-card-text>

      <v-card-actions class="flex-wrap gap-2 px-6 pb-6">
        <template v-if="editing && isOpen">
          <v-btn
            color="success"
            variant="tonal"
            :disabled="pending"
            @click="confirmAction = 'complete'"
          >
            Complete
          </v-btn>
          <v-btn
            color="warning"
            variant="text"
            :disabled="pending"
            @click="confirmAction = 'cancel'"
          >
            Cancel booking
          </v-btn>
        </template>
        <v-spacer />
        <v-btn variant="text" :disabled="pending" @click="close">Close</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          type="submit"
          form="booking-form"
          :loading="
            createMutation.isPending.value || updateMutation.isPending.value
          "
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog
      :model-value="confirmAction !== null"
      max-width="420"
      @update:model-value="!$event && (confirmAction = null)"
    >
      <v-card rounded="xl">
        <v-card-title class="px-6 pt-6">
          {{
            confirmAction === 'complete'
              ? 'Complete booking?'
              : 'Cancel booking?'
          }}
        </v-card-title>
        <v-card-text class="px-6">
          {{
            confirmAction === 'complete'
              ? 'The booking will move to the archive. You can optionally create a certification next.'
              : 'The booking will move to the archive. This does not create a certification.'
          }}
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="confirmAction = null">Go back</v-btn>
          <v-btn
            :color="confirmAction === 'complete' ? 'success' : 'warning'"
            variant="flat"
            :loading="
              completeMutation.isPending.value || cancelMutation.isPending.value
            "
            @click="runConfirmedAction"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>
