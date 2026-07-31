import {
  changePasswordResponseSchema,
  domainLookupResponseSchema,
  getCurrentUserResponseSchema,
  invitationResponseSchema,
  registrationResponseSchema,
  requestPasswordResetResponseSchema,
  resendVerificationResponseSchema,
  resetPasswordResponseSchema,
  signInResponseSchema,
  signOutResponseSchema,
  updateProfileResponseSchema,
  verifyEmailResponseSchema,
  type ChangePasswordRequest,
  type DomainLookupRequest,
  type InvitationRequest,
  type RegistrationRequest,
  type RequestPasswordResetRequest,
  type ResendVerificationRequest,
  type ResetPasswordRequest,
  type SignInRequest,
  type UpdateProfileRequest,
  type VerifyEmailRequest,
} from '../../../shared/contracts/account'
import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/vue-query'
import type { z } from 'zod'

export type FieldErrors = Record<string, string[]>

export class AccountApiError extends Error {
  readonly fieldErrors: FieldErrors
  readonly status: number

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'AccountApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function accountRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload as {
      message?: unknown
      fieldErrors?: unknown
      errors?: unknown
    } | null
    const fieldErrors =
      error && typeof error.fieldErrors === 'object'
        ? (error.fieldErrors as FieldErrors)
        : error && typeof error.errors === 'object'
          ? (error.errors as FieldErrors)
          : {}

    throw new AccountApiError(
      error && typeof error.message === 'string'
        ? error.message
        : 'Something went wrong. Please try again.',
      response.status,
      fieldErrors,
    )
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new AccountApiError('The server returned an invalid response.', 500)
  }
  return parsed.data
}

const json = (value: unknown) => JSON.stringify(value)

export const accountKeys = {
  all: ['account'] as const,
  currentUser: () => [...accountKeys.all, 'current-user'] as const,
}

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: accountKeys.currentUser(),
    queryFn: getCurrentUser,
    retry: (failureCount, error) =>
      !(error instanceof AccountApiError && error.status === 401) &&
      failureCount < 2,
  })

export const registrationMutationOptions = () =>
  mutationOptions({ mutationFn: register })

export const domainLookupMutationOptions = () =>
  mutationOptions({ mutationFn: lookupCompanyDomain })

export const signInMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: signIn,
    onSuccess: (response) => {
      queryClient.setQueryData(accountKeys.currentUser(), response)
    },
  })

export const verifyEmailMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: verifyEmail,
    onSuccess: (response) => {
      queryClient.setQueryData(accountKeys.currentUser(), response)
    },
  })

export const profileMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (input: UpdateProfileRequest) =>
      updateProfile(queryClient, input),
  })

export const passwordMutationOptions = () =>
  mutationOptions({ mutationFn: changePassword })

export const invitationMutationOptions = () =>
  mutationOptions({ mutationFn: inviteMember })

export const signOutMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => signOut(queryClient),
  })

export const lookupCompanyDomain = (input: DomainLookupRequest) =>
  accountRequest('/api/account/domain', domainLookupResponseSchema, {
    method: 'POST',
    body: json(input),
  })

export const register = (input: RegistrationRequest) =>
  accountRequest('/api/account/register', registrationResponseSchema, {
    method: 'POST',
    body: json(input),
  })

export const verifyEmail = (input: VerifyEmailRequest) =>
  accountRequest('/api/account/verify-email', verifyEmailResponseSchema, {
    method: 'POST',
    body: json(input),
  })

export const resendVerification = (input: ResendVerificationRequest) =>
  accountRequest(
    '/api/account/resend-verification',
    resendVerificationResponseSchema,
    { method: 'POST', body: json(input) },
  )

export const signIn = (input: SignInRequest) =>
  accountRequest('/api/account/sign-in', signInResponseSchema, {
    method: 'POST',
    body: json(input),
  })

export const signOut = async (queryClient: QueryClient) => {
  const result = await accountRequest(
    '/api/account/sign-out',
    signOutResponseSchema,
    { method: 'POST' },
  )
  queryClient.clear()
  return result
}

export const requestPasswordReset = (input: RequestPasswordResetRequest) =>
  accountRequest(
    '/api/account/request-password-reset',
    requestPasswordResetResponseSchema,
    { method: 'POST', body: json(input) },
  )

export const resetPassword = (input: ResetPasswordRequest) =>
  accountRequest('/api/account/reset-password', resetPasswordResponseSchema, {
    method: 'POST',
    body: json(input),
  })

export const getCurrentUser = () =>
  accountRequest('/api/account/me', getCurrentUserResponseSchema)

export const updateProfile = async (
  queryClient: QueryClient,
  input: UpdateProfileRequest,
) => {
  const response = await accountRequest(
    '/api/account/me',
    updateProfileResponseSchema,
    { method: 'PATCH', body: json(input) },
  )
  queryClient.setQueryData(accountKeys.currentUser(), response)
  return response
}

export const changePassword = (input: ChangePasswordRequest) =>
  accountRequest('/api/account/me/password', changePasswordResponseSchema, {
    method: 'PATCH',
    body: json(input),
  })

export const inviteMember = (input: InvitationRequest) =>
  accountRequest('/api/account/invitations', invitationResponseSchema, {
    method: 'POST',
    body: json(input),
  })
