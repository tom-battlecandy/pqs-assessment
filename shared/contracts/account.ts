import { z } from 'zod'

export const passwordSchema = z.string().min(8).max(128)

export const emailSchema = z.string().trim().email().max(250)

export const companySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(250),
    emailDomain: z.string().min(1).max(250),
  })
  .strict()

export const currentUserSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(250),
    email: emailSchema,
    emailVerifiedAt: z.iso.datetime(),
    company: companySchema,
  })
  .strict()

export const domainLookupRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict()

export const domainLookupResponseSchema = z
  .object({
    claimed: z.boolean(),
    companyName: z.string().min(1).max(250).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.claimed !== (value.companyName !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['companyName'],
        message:
          'Company name must be present exactly when the domain is claimed',
      })
    }
  })

export const registrationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(250),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
    companyName: z.string().trim().min(1).max(250).optional(),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords must match',
    path: ['passwordConfirmation'],
  })

export const verificationEmailGeneratedMessage =
  'Verification email generated. Check the API console for the email.' as const

export const registrationResponseSchema = z
  .object({
    message: z.literal(verificationEmailGeneratedMessage),
  })
  .strict()

export const verifyEmailRequestSchema = z
  .object({
    token: z.string().min(1).max(512),
  })
  .strict()

export const sessionResponseSchema = z
  .object({
    user: currentUserSchema,
  })
  .strict()

export const verifyEmailResponseSchema = sessionResponseSchema

export const resendVerificationRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict()

export const resendVerificationResponseSchema = registrationResponseSchema

export const signInRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict()

export const signInResponseSchema = sessionResponseSchema

export const signOutResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .strict()

export const passwordResetRequestedMessage =
  'If an account exists, a password reset email has been generated. Check the API console for the email.' as const

export const requestPasswordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict()

export const requestPasswordResetResponseSchema = z
  .object({
    message: z.literal(passwordResetRequestedMessage),
  })
  .strict()

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(1).max(512),
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords must match',
    path: ['passwordConfirmation'],
  })

export const resetPasswordResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .strict()

export const changePasswordRequestSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    newPasswordConfirmation: passwordSchema,
  })
  .strict()
  .refine((value) => value.newPassword === value.newPasswordConfirmation, {
    message: 'Passwords must match',
    path: ['newPasswordConfirmation'],
  })

export const changePasswordResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .strict()

export const getCurrentUserResponseSchema = sessionResponseSchema

export const updateProfileRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(250),
  })
  .strict()

export const updateProfileResponseSchema = sessionResponseSchema

export const invitationGeneratedMessage =
  'Invitation email generated. Check the API console for the email.' as const

export const invitationRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict()

export const invitationResponseSchema = z
  .object({
    message: z.literal(invitationGeneratedMessage),
  })
  .strict()

export type Company = z.infer<typeof companySchema>
export type CurrentUser = z.infer<typeof currentUserSchema>
export type DomainLookupRequest = z.infer<typeof domainLookupRequestSchema>
export type DomainLookupResponse = z.infer<typeof domainLookupResponseSchema>
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>
export type RegistrationResponse = z.infer<typeof registrationResponseSchema>
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>
export type ResendVerificationRequest = z.infer<
  typeof resendVerificationRequestSchema
>
export type ResendVerificationResponse = z.infer<
  typeof resendVerificationResponseSchema
>
export type SignInRequest = z.infer<typeof signInRequestSchema>
export type SignInResponse = z.infer<typeof signInResponseSchema>
export type SignOutResponse = z.infer<typeof signOutResponseSchema>
export type SessionResponse = z.infer<typeof sessionResponseSchema>
export type RequestPasswordResetRequest = z.infer<
  typeof requestPasswordResetRequestSchema
>
export type RequestPasswordResetResponse = z.infer<
  typeof requestPasswordResetResponseSchema
>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>
export type ChangePasswordResponse = z.infer<
  typeof changePasswordResponseSchema
>
export type GetCurrentUserResponse = z.infer<
  typeof getCurrentUserResponseSchema
>
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>
export type UpdateProfileResponse = z.infer<typeof updateProfileResponseSchema>
export type InvitationRequest = z.infer<typeof invitationRequestSchema>
export type InvitationResponse = z.infer<typeof invitationResponseSchema>
