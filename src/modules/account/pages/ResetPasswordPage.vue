<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from '../../../../shared/contracts/account'
import { AccountApiError, resetPassword } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const route = useRoute()
const router = useRouter()
const form = reactive({
  password: '',
  passwordConfirmation: '',
})
const errors = reactive<Record<string, string[]>>({})
const status = ref<'form' | 'success' | 'expired' | 'used' | 'invalid'>('form')
const statusError = ref('')
const submitting = ref(false)

onMounted(() => {
  const token = verifyEmailRequestSchema.shape.token.safeParse(
    route.query.token,
  )
  if (!token.success) {
    status.value = 'invalid'
    statusError.value = 'This password-reset link is invalid.'
  }
})

async function submit() {
  if (submitting.value) return
  Object.keys(errors).forEach((key) => delete errors[key])
  statusError.value = ''
  const parsed = resetPasswordRequestSchema.safeParse({
    token: route.query.token,
    ...form,
  })
  if (!parsed.success) {
    Object.assign(errors, zodFieldErrors(parsed.error))
    if (errors.token) status.value = 'invalid'
    return
  }

  submitting.value = true
  try {
    await resetPassword(parsed.data)
    status.value = 'success'
    window.setTimeout(() => void router.replace('/'), 1200)
  } catch (error) {
    const apiError = error instanceof AccountApiError ? error : null
    const lowerMessage = apiError?.message.toLowerCase() ?? ''
    if (lowerMessage.includes('expired')) status.value = 'expired'
    else if (lowerMessage.includes('used')) status.value = 'used'
    else if (
      apiError?.status === 400 &&
      !Object.keys(apiError.fieldErrors).length
    )
      status.value = 'invalid'
    statusError.value = applyApiError(error, errors)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
    <v-card class="w-full" elevation="3">
      <v-card-text class="pa-7 sm:pa-10">
        <template v-if="status === 'success'">
          <v-icon
            icon="mdi-check-circle"
            color="success"
            size="48"
            class="mb-4"
          />
          <h1 class="text-3xl font-bold">Password reset</h1>
          <p class="mt-3 text-slate-600" role="status">
            Your password has been updated. Taking you to sign in…
          </p>
          <v-btn color="primary" to="/" class="mt-6">Continue to sign in</v-btn>
        </template>
        <template v-else-if="status !== 'form'">
          <v-icon
            icon="mdi-alert-circle"
            color="warning"
            size="48"
            class="mb-4"
          />
          <h1 class="text-3xl font-bold">
            {{
              status === 'expired'
                ? 'Reset link expired'
                : status === 'used'
                  ? 'Reset link already used'
                  : 'Invalid reset link'
            }}
          </h1>
          <p class="mt-3 text-slate-600" role="alert">
            {{ statusError || 'This password-reset link is invalid.' }}
          </p>
          <v-btn color="primary" to="/" class="mt-6">
            Request another reset
          </v-btn>
        </template>
        <template v-else>
          <h1 class="text-3xl font-bold">Choose a new password</h1>
          <p class="mt-3 mb-7 text-slate-600">Use 8 to 128 characters.</p>
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
            <v-text-field
              v-model="form.password"
              label="New password"
              type="password"
              autocomplete="new-password"
              :error-messages="errorMessages(errors, 'password')"
              required
            />
            <v-text-field
              v-model="form.passwordConfirmation"
              label="Confirm new password"
              type="password"
              autocomplete="new-password"
              :error-messages="errorMessages(errors, 'passwordConfirmation')"
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
              Reset password
            </v-btn>
          </form>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>
