<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import {
  requestPasswordResetRequestSchema,
  type CurrentUser,
} from '../../../../shared/contracts/account'
import RegistrationForm from '../components/RegistrationForm.vue'
import ResendVerificationForm from '../components/ResendVerificationForm.vue'
import SignInForm from '../components/SignInForm.vue'
import { accountKeys, requestPasswordReset } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const router = useRouter()
const queryClient = useQueryClient()
const tab = ref<'sign-in' | 'register'>('sign-in')
const registeredMessage = ref('')
const registeredEmail = ref('')
const resetDialog = ref(false)
const resetForm = reactive({ email: '' })
const resetErrors = reactive<Record<string, string[]>>({})
const resetStatus = ref('')
const resetError = ref('')
const requestingReset = ref(false)

async function signedIn(user: CurrentUser) {
  queryClient.setQueryData(accountKeys.currentUser(), { user })
  await router.push('/dashboard')
}

function showPasswordReset(email: string) {
  resetForm.email = email
  resetStatus.value = ''
  resetError.value = ''
  resetDialog.value = true
}

async function requestReset() {
  if (requestingReset.value) return
  Object.keys(resetErrors).forEach((key) => delete resetErrors[key])
  resetStatus.value = ''
  resetError.value = ''
  const parsed = requestPasswordResetRequestSchema.safeParse(resetForm)
  if (!parsed.success) {
    Object.assign(resetErrors, zodFieldErrors(parsed.error))
    return
  }

  requestingReset.value = true
  try {
    resetStatus.value = (await requestPasswordReset(parsed.data)).message
  } catch (error) {
    resetError.value = applyApiError(error, resetErrors)
  } finally {
    requestingReset.value = false
  }
}
</script>

<template>
  <div
    class="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:px-8"
  >
    <section>
      <p
        class="mb-3 text-sm font-semibold tracking-widest text-pqs-primary uppercase"
      >
        PQS Training Certification
      </p>
      <h1 class="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        Keep your training record ready.
      </h1>
      <p class="mt-5 max-w-xl text-lg leading-8 text-slate-600">
        Manage your personal bookings and certifications in one place with your
        company account.
      </p>
    </section>

    <v-card class="w-full" elevation="4">
      <v-tabs v-model="tab" grow color="primary">
        <v-tab value="sign-in">Sign in</v-tab>
        <v-tab value="register">Register</v-tab>
      </v-tabs>
      <v-divider />
      <v-window v-model="tab">
        <v-window-item value="sign-in">
          <v-card-text class="pa-6 sm:pa-8">
            <h2 class="mb-6 text-2xl font-semibold">Welcome back</h2>
            <SignInForm
              @signed-in="signedIn"
              @forgot-password="showPasswordReset"
            />
          </v-card-text>
        </v-window-item>
        <v-window-item value="register">
          <v-card-text class="pa-6 sm:pa-8">
            <h2 class="mb-6 text-2xl font-semibold">Create your account</h2>
            <v-alert
              v-if="registeredMessage"
              type="success"
              variant="tonal"
              class="mb-6"
              role="status"
            >
              {{ registeredMessage }}
            </v-alert>
            <RegistrationForm
              v-if="!registeredMessage"
              @registered="
                (message, email) => {
                  registeredMessage = message
                  registeredEmail = email
                }
              "
            />
            <div v-else>
              <v-btn
                color="primary"
                variant="text"
                @click="registeredMessage = ''"
              >
                Register another account
              </v-btn>
              <v-expansion-panels class="mt-4">
                <v-expansion-panel title="Need another verification email?">
                  <v-expansion-panel-text>
                    <ResendVerificationForm :initial-email="registeredEmail" />
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>
  </div>

  <v-dialog v-model="resetDialog" max-width="520" :persistent="requestingReset">
    <v-card>
      <v-card-title>Reset your password</v-card-title>
      <v-card-text>
        <p class="mb-5 text-sm text-slate-600">
          Enter your email and we’ll generate reset instructions when an account
          exists.
        </p>
        <form id="request-reset-form" novalidate @submit.prevent="requestReset">
          <v-alert
            v-if="resetStatus"
            type="success"
            variant="tonal"
            class="mb-4"
            role="status"
          >
            {{ resetStatus }}
          </v-alert>
          <v-alert
            v-if="resetError"
            type="error"
            variant="tonal"
            class="mb-4"
            role="alert"
          >
            {{ resetError }}
          </v-alert>
          <v-text-field
            v-model="resetForm.email"
            label="Email address"
            type="email"
            autocomplete="email"
            :error-messages="errorMessages(resetErrors, 'email')"
            required
          />
        </form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="requestingReset" @click="resetDialog = false">
          Close
        </v-btn>
        <v-btn
          v-if="!resetStatus"
          type="submit"
          form="request-reset-form"
          color="primary"
          :loading="requestingReset"
          :disabled="requestingReset"
        >
          Generate reset email
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
