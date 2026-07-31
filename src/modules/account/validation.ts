import type { z } from 'zod'
import { AccountApiError, type FieldErrors } from './api'

export const zodFieldErrors = (error: z.ZodError): FieldErrors => {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form')
    errors[field] = [...(errors[field] ?? []), issue.message]
  }
  return errors
}

export const errorMessages = (errors: FieldErrors, field: string): string[] =>
  errors[field] ?? []

export const applyApiError = (
  error: unknown,
  fieldErrors: FieldErrors,
): string => {
  if (error instanceof AccountApiError) {
    Object.assign(fieldErrors, error.fieldErrors)
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
