<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmailRequestSchema } from '../../../../shared/contracts/account'
import ResendVerificationForm from '../components/ResendVerificationForm.vue'
import { AccountApiError, accountKeys, verifyEmail } from '../api'

type VerificationState = 'loading' | 'success' | 'expired' | 'used' | 'invalid'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const state = ref<VerificationState>('loading')
const message = ref('')

const title = computed(() => {
  if (state.value === 'loading') return 'Verifying your email'
  if (state.value === 'success') return 'Email verified'
  if (state.value === 'expired') return 'Verification link expired'
  if (state.value === 'used') return 'Verification link already used'
  return 'Invalid verification link'
})

onMounted(async () => {
  const parsed = verifyEmailRequestSchema.safeParse({
    token: route.query.token,
  })
  if (!parsed.success) {
    state.value = 'invalid'
    message.value = 'This verification link is invalid.'
    return
  }

  try {
    const response = await verifyEmail(parsed.data)
    queryClient.setQueryData(accountKeys.currentUser(), response)
    state.value = 'success'
    message.value =
      'Your email has been verified. Taking you to your dashboard…'
    window.setTimeout(() => void router.replace('/dashboard'), 900)
  } catch (error) {
    const apiError = error instanceof AccountApiError ? error : null
    const lowerMessage = apiError?.message.toLowerCase() ?? ''
    state.value = lowerMessage.includes('expired')
      ? 'expired'
      : lowerMessage.includes('used')
        ? 'used'
        : 'invalid'
    message.value = apiError?.message ?? 'This verification link is invalid.'
  }
})
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12">
    <v-card class="w-full" elevation="3">
      <v-card-text class="pa-7 sm:pa-10">
        <v-skeleton-loader
          v-if="state === 'loading'"
          type="heading, paragraph"
          aria-label="Verifying email"
        />
        <template v-else>
          <v-icon
            :icon="
              state === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
            "
            :color="state === 'success' ? 'success' : 'warning'"
            size="48"
            class="mb-4"
          />
          <h1 class="text-3xl font-bold">{{ title }}</h1>
          <p class="mt-3 text-slate-600" role="status">{{ message }}</p>
          <v-btn
            v-if="state === 'success'"
            color="primary"
            class="mt-6"
            to="/dashboard"
          >
            Continue to dashboard
          </v-btn>
          <div v-else class="mt-8">
            <h2 class="mb-4 text-lg font-semibold">Generate a new link</h2>
            <ResendVerificationForm />
            <v-btn variant="text" color="primary" to="/" class="mt-2">
              Return to sign in
            </v-btn>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>
