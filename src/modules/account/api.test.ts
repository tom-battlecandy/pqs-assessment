/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  passwordResetRequestedMessage,
  type ChangePasswordRequest,
} from '../../../shared/contracts/account'
import {
  AccountApiError,
  changePassword,
  lookupCompanyDomain,
  requestPasswordReset,
  resetPassword,
} from './api'

test('account client uses the mounted API paths and methods', async () => {
  const originalFetch = globalThis.fetch
  const requests: { path: string; method: string }[] = []

  globalThis.fetch = async (input, init) => {
    const path = String(input)
    requests.push({ path, method: init?.method ?? 'GET' })

    const payload =
      path === '/api/account/domain-lookup'
        ? { claimed: true, companyName: 'Northstar Safety' }
        : path === '/api/account/password-reset'
          ? { message: passwordResetRequestedMessage }
          : { success: true }

    return Response.json(payload)
  }

  try {
    await lookupCompanyDomain({ email: 'alex@northstar.test' })
    await requestPasswordReset({ email: 'alex@northstar.test' })
    await resetPassword({
      token: 'reset-token',
      password: 'new-password',
      passwordConfirmation: 'new-password',
    })
    await changePassword({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      newPasswordConfirmation: 'new-password',
    } satisfies ChangePasswordRequest)
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.deepEqual(requests, [
    { path: '/api/account/domain-lookup', method: 'POST' },
    { path: '/api/account/password-reset', method: 'POST' },
    { path: '/api/account/password-reset/complete', method: 'POST' },
    { path: '/api/account/password/change', method: 'POST' },
  ])
})

test('account client exposes server field validation errors', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    Response.json(
      {
        message: 'Use your company email address',
        fields: { email: ['Company email required'] },
      },
      { status: 422 },
    )

  try {
    await assert.rejects(
      lookupCompanyDomain({ email: 'person@gmail.com' }),
      (error: unknown) => {
        assert.ok(error instanceof AccountApiError)
        assert.equal(error.status, 422)
        assert.deepEqual(error.fieldErrors, {
          email: ['Company email required'],
        })
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
