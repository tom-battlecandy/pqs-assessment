<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { IsoDate } from '../../../shared/contracts/training'
import { currentUserQueryOptions } from '../account/api'
import InviteMemberDialog from '../account/components/InviteMemberDialog.vue'
import ProfileEditor from '../account/components/ProfileEditor.vue'
import { trainingDataQueryOptions } from '../training/api'
import DashboardSummaryCard from './components/DashboardSummaryCard.vue'
import { buildDashboardTrainingSummaries } from './summary'

const invitationOpen = ref(false)
const accountSettingsOpen = ref(false)
const accountQuery = useQuery(currentUserQueryOptions())
const trainingQuery = useQuery(trainingDataQueryOptions())

function getLocalIsoDate(): IsoDate {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const trainingSummaries = computed(() =>
  trainingQuery.data.value
    ? buildDashboardTrainingSummaries(
        trainingQuery.data.value,
        getLocalIsoDate(),
      )
    : null,
)
</script>

<template>
  <div class="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <v-alert
      v-if="accountQuery.isError.value"
      type="error"
      variant="tonal"
      class="mb-8"
      role="alert"
    >
      We could not load your account. Please refresh the page and try again.
    </v-alert>

    <v-skeleton-loader
      v-if="accountQuery.isPending.value"
      class="mb-8 max-w-2xl"
      type="heading, paragraph, button"
      aria-label="Loading account details"
    />

    <header
      v-else-if="accountQuery.data.value"
      class="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"
    >
      <div>
        <p
          class="mb-2 text-sm font-semibold tracking-widest text-pqs-primary uppercase"
        >
          {{ accountQuery.data.value.user.company.name }}
        </p>
        <h1
          class="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Welcome, {{ accountQuery.data.value.user.name }}
        </h1>
        <p class="mt-2 text-slate-600">
          {{ accountQuery.data.value.user.email }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-account-cog"
          @click="accountSettingsOpen = true"
        >
          Account settings
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="invitationOpen = true"
        >
          Invite company member
        </v-btn>
      </div>
    </header>

    <section aria-labelledby="training-summary-title">
      <h2
        id="training-summary-title"
        class="mb-5 text-2xl font-semibold tracking-tight text-slate-950"
      >
        Your training at a glance
      </h2>

      <div class="grid items-stretch gap-6 lg:grid-cols-2">
        <DashboardSummaryCard
          title="Upcoming Training Bookings"
          empty-text="You have no upcoming Bookings"
          :events="trainingSummaries?.bookings.events ?? []"
          :total-events="trainingSummaries?.bookings.totalEvents ?? 0"
          :loading="trainingQuery.isPending.value"
          :error="trainingQuery.isError.value"
          to="/training?type=booking"
        />
        <DashboardSummaryCard
          title="Upcoming Certificate Expirations"
          empty-text="You have no upcoming Certificate Expirations"
          :events="trainingSummaries?.expirations.events ?? []"
          :total-events="trainingSummaries?.expirations.totalEvents ?? 0"
          :loading="trainingQuery.isPending.value"
          :error="trainingQuery.isError.value"
          to="/training?type=expiration"
        />
      </div>
    </section>

    <v-dialog
      v-if="accountQuery.data.value"
      v-model="accountSettingsOpen"
      max-width="1100"
      scrollable
      aria-labelledby="account-settings-title"
    >
      <v-card rounded="xl">
        <v-card-title class="flex! items-center px-6 pt-6">
          <span id="account-settings-title" class="text-h5">
            Account settings
          </span>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Close account settings"
            @click="accountSettingsOpen = false"
          />
        </v-card-title>
        <v-card-text class="px-6 pb-6">
          <ProfileEditor :user="accountQuery.data.value.user" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <InviteMemberDialog
      v-if="accountQuery.data.value"
      v-model="invitationOpen"
      :company-name="accountQuery.data.value.user.company.name"
      :company-domain="accountQuery.data.value.user.company.emailDomain"
    />
  </div>
</template>
