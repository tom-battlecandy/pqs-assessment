import { createRouter, createWebHistory } from 'vue-router'

import { AccountApiError, currentUserQueryOptions } from '@/modules/account/api'
import { queryClient } from './query-client'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'account-entry',
      component: () => import('@/modules/account/pages/AccountEntryPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      redirect: (to) => ({
        name: 'account-entry',
        query: { ...to.query, tab: 'register' },
      }),
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/modules/account/pages/VerifyEmailPage.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/modules/account/pages/ResetPasswordPage.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/modules/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/training',
      name: 'training',
      component: () => import('@/modules/training/TrainingPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly) return true

  try {
    await queryClient.fetchQuery(currentUserQueryOptions())
    return to.meta.guestOnly ? { name: 'dashboard' } : true
  } catch (error) {
    if (!(error instanceof AccountApiError) || error.status !== 401) {
      return true
    }

    queryClient.removeQueries({ queryKey: ['account'] })
    return to.meta.requiresAuth
      ? { name: 'account-entry', query: { redirect: to.fullPath } }
      : true
  }
})
