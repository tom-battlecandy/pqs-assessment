<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { invitationRequestSchema } from '../../../../shared/contracts/account'
import { inviteMember } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const props = defineProps<{
  modelValue: boolean
  companyName: string
  companyDomain: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const form = reactive({ email: '' })
const errors = reactive<Record<string, string[]>>({})
const status = ref('')
const statusError = ref('')
const submitting = ref(false)
const emailInput = ref<{ focus: () => void } | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      status.value = ''
      statusError.value = ''
      Object.keys(errors).forEach((key) => delete errors[key])
      await nextTick()
      emailInput.value?.focus()
    }
  },
)

function close() {
  if (!submitting.value) emit('update:modelValue', false)
}

async function submit() {
  if (submitting.value) return
  Object.keys(errors).forEach((key) => delete errors[key])
  status.value = ''
  statusError.value = ''
  const parsed = invitationRequestSchema.safeParse(form)
  if (!parsed.success) {
    Object.assign(errors, zodFieldErrors(parsed.error))
    return
  }
  const submittedDomain = parsed.data.email.toLowerCase().split('@').at(-1)
  if (submittedDomain !== props.companyDomain.toLowerCase()) {
    errors.email = [`Use an @${props.companyDomain} email address`]
    return
  }

  submitting.value = true
  try {
    status.value = (await inviteMember(parsed.data)).message
    form.email = ''
  } catch (error) {
    statusError.value = applyApiError(error, errors)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    :persistent="submitting"
    @update:model-value="emit('update:modelValue', $event)"
    @after-leave="$emit('update:modelValue', false)"
  >
    <v-card>
      <v-card-title>Invite a {{ companyName }} colleague</v-card-title>
      <v-card-text>
        <p class="mb-5 text-sm text-slate-600">
          Invitations can only be generated for @{{ companyDomain }} addresses.
        </p>
        <form id="invite-member-form" novalidate @submit.prevent="submit">
          <v-alert
            v-if="status"
            type="success"
            variant="tonal"
            class="mb-4"
            role="status"
          >
            {{ status }}
          </v-alert>
          <v-alert
            v-if="statusError"
            type="error"
            variant="tonal"
            class="mb-4"
            role="alert"
          >
            {{ statusError }}
          </v-alert>
          <v-text-field
            ref="emailInput"
            v-model="form.email"
            label="Colleague email"
            type="email"
            autocomplete="email"
            :error-messages="errorMessages(errors, 'email')"
            required
          />
        </form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">
          Close
        </v-btn>
        <v-btn
          type="submit"
          form="invite-member-form"
          color="primary"
          :loading="submitting"
          :disabled="submitting"
        >
          Generate invitation
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
