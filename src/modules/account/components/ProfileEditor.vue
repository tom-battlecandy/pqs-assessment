<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import {
  changePasswordRequestSchema,
  updateProfileRequestSchema,
  type CurrentUser,
} from '../../../../shared/contracts/account'
import { changePassword, updateProfile } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const props = defineProps<{ user: CurrentUser }>()
const emit = defineEmits<{ updated: [user: CurrentUser] }>()
const queryClient = useQueryClient()

const profile = reactive({ name: props.user.name })
const profileErrors = reactive<Record<string, string[]>>({})
const profileStatus = ref('')
const profileError = ref('')
const savingProfile = ref(false)

const password = reactive({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirmation: '',
})
const passwordErrors = reactive<Record<string, string[]>>({})
const passwordStatus = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

watch(
  () => props.user.name,
  (name) => {
    profile.name = name
  },
)

async function saveProfile() {
  if (savingProfile.value) return
  Object.keys(profileErrors).forEach((key) => delete profileErrors[key])
  profileStatus.value = ''
  profileError.value = ''
  const parsed = updateProfileRequestSchema.safeParse(profile)
  if (!parsed.success) {
    Object.assign(profileErrors, zodFieldErrors(parsed.error))
    return
  }

  savingProfile.value = true
  try {
    const response = await updateProfile(queryClient, parsed.data)
    profileStatus.value = 'Profile updated.'
    emit('updated', response.user)
  } catch (error) {
    profileError.value = applyApiError(error, profileErrors)
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (savingPassword.value) return
  Object.keys(passwordErrors).forEach((key) => delete passwordErrors[key])
  passwordStatus.value = ''
  passwordError.value = ''
  const parsed = changePasswordRequestSchema.safeParse(password)
  if (!parsed.success) {
    Object.assign(passwordErrors, zodFieldErrors(parsed.error))
    return
  }

  savingPassword.value = true
  try {
    await changePassword(parsed.data)
    passwordStatus.value = 'Password updated.'
    password.currentPassword = ''
    password.newPassword = ''
    password.newPasswordConfirmation = ''
  } catch (error) {
    passwordError.value = applyApiError(error, passwordErrors)
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <v-card class="border-gray-200!" variant="outlined">
      <v-card-title>Profile</v-card-title>
      <v-card-text>
        <p class="mb-5 text-sm text-slate-600">
          {{ user.email }} · {{ user.company.name }}
        </p>
        <form novalidate @submit.prevent="saveProfile">
          <v-alert
            v-if="profileStatus"
            type="success"
            variant="tonal"
            class="mb-4"
            role="status"
          >
            {{ profileStatus }}
          </v-alert>
          <v-alert
            v-if="profileError"
            type="error"
            variant="tonal"
            class="mb-4"
            role="alert"
          >
            {{ profileError }}
          </v-alert>
          <v-text-field
            v-model="profile.name"
            label="Name"
            autocomplete="name"
            :error-messages="errorMessages(profileErrors, 'name')"
            required
          />
          <v-btn
            type="submit"
            color="primary"
            :loading="savingProfile"
            :disabled="savingProfile"
          >
            Save profile
          </v-btn>
        </form>
      </v-card-text>
    </v-card>

    <v-card class="border-gray-200!" variant="outlined">
      <v-card-title>Change password</v-card-title>
      <v-card-text>
        <form novalidate @submit.prevent="savePassword">
          <v-alert
            v-if="passwordStatus"
            type="success"
            variant="tonal"
            class="mb-4"
            role="status"
          >
            {{ passwordStatus }}
          </v-alert>
          <v-alert
            v-if="passwordError"
            type="error"
            variant="tonal"
            class="mb-4"
            role="alert"
          >
            {{ passwordError }}
          </v-alert>
          <v-text-field
            v-model="password.currentPassword"
            label="Current password"
            type="password"
            autocomplete="current-password"
            :error-messages="errorMessages(passwordErrors, 'currentPassword')"
            required
          />
          <v-text-field
            v-model="password.newPassword"
            label="New password"
            type="password"
            autocomplete="new-password"
            hint="Use 8 to 128 characters"
            :error-messages="errorMessages(passwordErrors, 'newPassword')"
            required
          />
          <v-text-field
            v-model="password.newPasswordConfirmation"
            label="Confirm new password"
            type="password"
            autocomplete="new-password"
            :error-messages="
              errorMessages(passwordErrors, 'newPasswordConfirmation')
            "
            required
          />
          <v-btn
            type="submit"
            color="primary"
            :loading="savingPassword"
            :disabled="savingPassword"
          >
            Change password
          </v-btn>
        </form>
      </v-card-text>
    </v-card>
  </div>
</template>
