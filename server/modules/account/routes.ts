import { Router } from 'express'
import type Database from 'better-sqlite3'

import {
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  domainLookupRequestSchema,
  domainLookupResponseSchema,
  getCurrentUserResponseSchema,
  invitationRequestSchema,
  invitationResponseSchema,
  registrationRequestSchema,
  registrationResponseSchema,
  requestPasswordResetRequestSchema,
  requestPasswordResetResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  signInRequestSchema,
  signInResponseSchema,
  signOutResponseSchema,
  updateProfileRequestSchema,
  updateProfileResponseSchema,
  verifyEmailRequestSchema,
  verifyEmailResponseSchema,
} from '../../../shared/contracts/account.js'
import {
  clearSessionCookie,
  type AuthenticatedRequest,
  requireSession,
  setSessionCookie,
} from '../../shared/auth.js'
import { createAccountService } from './service.js'

export function createAccountRouter(
  database: Database.Database,
  clientOrigin: string,
) {
  const router = Router()
  const service = createAccountService(database, { clientOrigin })
  const authenticated = requireSession(database)

  router.post('/domain-lookup', (request, response) => {
    const body = domainLookupRequestSchema.parse(request.body)
    response.json(
      domainLookupResponseSchema.parse(service.lookupDomain(body.email)),
    )
  })

  router.post('/register', (request, response) => {
    const body = registrationRequestSchema.parse(request.body)
    response
      .status(201)
      .json(registrationResponseSchema.parse(service.register(body)))
  })

  router.post('/verify-email', (request, response) => {
    const body = verifyEmailRequestSchema.parse(request.body)
    const result = service.verifyEmail(body.token)
    setSessionCookie(response, result.sessionId)
    response.json(verifyEmailResponseSchema.parse({ user: result.user }))
  })

  router.post('/resend-verification', (request, response) => {
    const body = resendVerificationRequestSchema.parse(request.body)
    response.json(
      resendVerificationResponseSchema.parse(
        service.resendVerification(body.email),
      ),
    )
  })

  router.post('/sign-in', (request, response) => {
    const body = signInRequestSchema.parse(request.body)
    const result = service.signIn(body.email, body.password)
    setSessionCookie(response, result.sessionId)
    response.json(signInResponseSchema.parse({ user: result.user }))
  })

  router.post('/sign-out', authenticated, (request, response) => {
    const auth = (request as AuthenticatedRequest).auth
    const result = service.signOut(auth.sessionId)
    clearSessionCookie(response)
    response.json(signOutResponseSchema.parse(result))
  })

  router.post('/password-reset', (request, response) => {
    const body = requestPasswordResetRequestSchema.parse(request.body)
    response.json(
      requestPasswordResetResponseSchema.parse(
        service.requestPasswordReset(body.email),
      ),
    )
  })

  router.post('/password-reset/complete', (request, response) => {
    const body = resetPasswordRequestSchema.parse(request.body)
    response.json(
      resetPasswordResponseSchema.parse(
        service.resetPassword(body.token, body.password),
      ),
    )
  })

  router.post('/password/change', authenticated, (request, response) => {
    const body = changePasswordRequestSchema.parse(request.body)
    const auth = (request as AuthenticatedRequest).auth
    response.json(
      changePasswordResponseSchema.parse(
        service.changePassword(
          auth.userId,
          auth.sessionId,
          body.currentPassword,
          body.newPassword,
        ),
      ),
    )
  })

  router.get('/me', authenticated, (request, response) => {
    const auth = (request as AuthenticatedRequest).auth
    response.json(
      getCurrentUserResponseSchema.parse({
        user: service.currentUser(auth.userId),
      }),
    )
  })

  router.patch('/me', authenticated, (request, response) => {
    const body = updateProfileRequestSchema.parse(request.body)
    const auth = (request as AuthenticatedRequest).auth
    response.json(
      updateProfileResponseSchema.parse(
        service.updateProfile(auth.userId, body.name),
      ),
    )
  })

  router.post('/invitations', authenticated, (request, response) => {
    const body = invitationRequestSchema.parse(request.body)
    const auth = (request as AuthenticatedRequest).auth
    response.json(
      invitationResponseSchema.parse(service.invite(auth.userId, body.email)),
    )
  })

  return router
}
