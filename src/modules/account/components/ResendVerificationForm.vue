<script setup lang="ts">
import { reactive, ref } from 'vue'
import { resendVerificationRequestSchema } from '../../../../shared/contracts/account'
import { resendVerification } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const props = withDefaults(defineProps<{ initialEmail?: string }>(), {
  initialEmail: '',
})

const form = reactive({ email: props.initialEmail })
const errors = reactive<Record<string, string[]>>({})
const status = ref('')
const statusError = ref('')
const submitting = ref(false)

async function submit() {
  if (submitting.value) return
  Object.keys(errors).forEach((key) => delete errors[key])
  status.value = ''
  statusError.value = ''
  const parsed = resendVerificationRequestSchema.safeParse(form)
  if (!parsed.success) {
    Object.assign(errors, zodFieldErrors(parsed.error))
    return
  }

  submitting.value = true
  try {
    status.value = (await resendVerification(parsed.data)).message
  } catch (error) {
    statusError.value = applyApiError(error, errors)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
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
    <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <v-text-field
        v-model="form.email"
        label="Email address"
        type="email"
        autocomplete="email"
        :error-messages="errorMessages(errors, 'email')"
        required
      />
      <v-btn
        type="submit"
        color="primary"
        class="sm:mt-1"
        :loading="submitting"
        :disabled="submitting"
      >
        Resend verification
      </v-btn>
    </div>
  </form>
</template>
