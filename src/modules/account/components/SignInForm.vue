<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  signInRequestSchema,
  type CurrentUser,
} from '../../../../shared/contracts/account'
import { signIn } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const emit = defineEmits<{
  signedIn: [user: CurrentUser]
  forgotPassword: [email: string]
}>()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string[]>>({})
const statusError = ref('')
const submitting = ref(false)

async function submit() {
  if (submitting.value) return
  Object.keys(errors).forEach((key) => delete errors[key])
  statusError.value = ''

  const parsed = signInRequestSchema.safeParse(form)
  if (!parsed.success) {
    Object.assign(errors, zodFieldErrors(parsed.error))
    return
  }

  submitting.value = true
  try {
    const response = await signIn(parsed.data)
    emit('signedIn', response.user)
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
      v-if="statusError"
      type="error"
      variant="tonal"
      class="mb-5"
      role="alert"
    >
      {{ statusError }}
    </v-alert>
    <div class="grid gap-4">
      <v-text-field
        v-model="form.email"
        label="Company email"
        type="email"
        autocomplete="email"
        :error-messages="errorMessages(errors, 'email')"
        required
      />
      <v-text-field
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="current-password"
        :error-messages="errorMessages(errors, 'password')"
        required
      />
      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="submitting"
        :disabled="submitting"
      >
        Sign in
      </v-btn>
      <v-btn
        variant="text"
        color="primary"
        :disabled="submitting"
        @click="emit('forgotPassword', form.email)"
      >
        Forgot your password?
      </v-btn>
    </div>
  </form>
</template>
