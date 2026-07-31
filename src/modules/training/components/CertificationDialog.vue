<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type {
  IsoDate,
  Topic,
  TrainingRecord,
} from '../../../../shared/contracts/training'
import {
  createTrainingRecordMutationOptions,
  TrainingApiError,
  updateTrainingRecordMutationOptions,
} from '../api'

const props = defineProps<{
  modelValue: boolean
  topics: Topic[]
  trainingRecord?: TrainingRecord
  initialTopicId?: number
  initialAwardedAt?: IsoDate
  quickCreate?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const queryClient = useQueryClient()
const createMutation = useMutation(
  createTrainingRecordMutationOptions(queryClient),
)
const updateMutation = useMutation(
  updateTrainingRecordMutationOptions(queryClient),
)

const topicId = ref<number | null>(null)
const awardedAt = ref('')
const expiresAt = ref('')
const localError = ref('')

const editing = computed(() => props.trainingRecord !== undefined)
const pending = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value,
)
const mutationError = computed(() => {
  const error = createMutation.error.value ?? updateMutation.error.value
  return error instanceof TrainingApiError ? error : null
})
const errorMessage = computed(
  () => localError.value || mutationError.value?.message || '',
)

function reset() {
  topicId.value = props.trainingRecord?.topicId ?? props.initialTopicId ?? null
  awardedAt.value =
    props.trainingRecord?.awardedAt ?? props.initialAwardedAt ?? ''
  expiresAt.value = props.trainingRecord?.expiresAt ?? ''
  localError.value = ''
  createMutation.reset()
  updateMutation.reset()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)

async function save() {
  localError.value = ''
  if (topicId.value === null || !awardedAt.value) {
    localError.value = 'Choose a topic and awarded date.'
    return
  }
  if (expiresAt.value && expiresAt.value < awardedAt.value) {
    localError.value = 'Expiration date cannot be before the awarded date.'
    return
  }

  const input = {
    topicId: topicId.value,
    awardedAt: awardedAt.value as IsoDate,
    expiresAt: expiresAt.value ? (expiresAt.value as IsoDate) : null,
  }

  try {
    if (props.trainingRecord) {
      await updateMutation.mutateAsync({
        id: props.trainingRecord.id,
        input,
      })
    } else {
      await createMutation.mutateAsync(input)
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    // Mutation state renders the API error.
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
        {{
          quickCreate
            ? 'Add certification'
            : editing
              ? 'Edit certification'
              : 'Add certification'
        }}
      </v-card-title>
      <v-card-subtitle v-if="quickCreate" class="px-6 pt-1 text-wrap">
        Booking completed. Creating a certification is optional.
      </v-card-subtitle>
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

        <v-form id="certification-form" @submit.prevent="save">
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
            v-model="awardedAt"
            label="Awarded date"
            type="date"
            :error-messages="mutationError?.fieldErrors.awardedAt"
            required
          />
          <v-text-field
            v-model="expiresAt"
            label="Expiration date (optional)"
            type="date"
            :min="awardedAt || undefined"
            :error-messages="mutationError?.fieldErrors.expiresAt"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="pending"
          @click="emit('update:modelValue', false)"
        >
          {{ quickCreate ? 'Skip' : 'Close' }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          type="submit"
          form="certification-form"
          :loading="pending"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
