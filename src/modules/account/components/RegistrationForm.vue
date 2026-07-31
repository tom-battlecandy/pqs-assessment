<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  emailSchema,
  registrationRequestSchema,
  type DomainLookupResponse,
} from '../../../../shared/contracts/account'
import { lookupCompanyDomain, register } from '../api'
import { applyApiError, errorMessages, zodFieldErrors } from '../validation'

const emit = defineEmits<{
  registered: [message: string, email: string]
}>()

const form = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  companyName: '',
})
const errors = reactive<Record<string, string[]>>({})
const domain = ref<DomainLookupResponse | null>(null)
const checkedEmail = ref('')
const checkingDomain = ref(false)
const submitting = ref(false)
const statusError = ref('')

async function checkDomain() {
  delete errors.email
  domain.value = null
  checkedEmail.value = ''
  const parsed = emailSchema.safeParse(form.email)
  if (!parsed.success) {
    errors.email = parsed.error.issues.map((issue) => issue.message)
    return
  }

  checkingDomain.value = true
  try {
    domain.value = await lookupCompanyDomain({ email: parsed.data })
    checkedEmail.value = parsed.data
  } catch (error) {
    statusError.value = applyApiError(error, errors)
  } finally {
    checkingDomain.value = false
  }
}

async function submit() {
  if (submitting.value || checkingDomain.value) return
  Object.keys(errors).forEach((key) => delete errors[key])
  statusError.value = ''

  const normalizedEmail = emailSchema.safeParse(form.email)
  if (
    !normalizedEmail.success ||
    checkedEmail.value !== normalizedEmail.data ||
    !domain.value
  ) {
    await checkDomain()
    if (!domain.value) return
  }

  const input = {
    name: form.name,
    email: form.email,
    password: form.password,
    passwordConfirmation: form.passwordConfirmation,
    ...(domain.value?.claimed ? {} : { companyName: form.companyName }),
  }
  const parsed = registrationRequestSchema.safeParse(input)
  if (!parsed.success) {
    Object.assign(errors, zodFieldErrors(parsed.error))
    return
  }
  if (!domain.value?.claimed && !form.companyName.trim()) {
    errors.companyName = ['Company name is required for an unclaimed domain']
    return
  }

  submitting.value = true
  try {
    const response = await register(parsed.data)
    emit('registered', response.message, parsed.data.email)
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
        v-model="form.name"
        label="Your name"
        autocomplete="name"
        :error-messages="errorMessages(errors, 'name')"
        required
      />
      <v-text-field
        v-model="form.email"
        label="Company email"
        type="email"
        autocomplete="email"
        :error-messages="errorMessages(errors, 'email')"
        :loading="checkingDomain"
        required
        @blur="checkDomain"
        @update:model-value="domain = null"
      />
      <v-alert
        v-if="domain?.claimed"
        type="info"
        variant="tonal"
        density="compact"
      >
        Your account will join {{ domain.companyName }} after verification.
      </v-alert>
      <v-text-field
        v-if="domain && !domain.claimed"
        v-model="form.companyName"
        label="Company name"
        autocomplete="organization"
        :error-messages="errorMessages(errors, 'companyName')"
        required
      />
      <v-text-field
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="new-password"
        hint="Use 8 to 128 characters"
        :error-messages="errorMessages(errors, 'password')"
        required
      />
      <v-text-field
        v-model="form.passwordConfirmation"
        label="Confirm password"
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
        :loading="submitting || checkingDomain"
        :disabled="submitting || checkingDomain"
      >
        Create account
      </v-btn>
    </div>
  </form>
</template>
