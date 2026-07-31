import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  void next
  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const field = issue.path.join('.') || '_form'
      ;(fields[field] ??= []).push(issue.message)
    }
    response.status(400).json({ message: 'Validation failed', fields })
    return
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      message: error.message,
      ...(error.fields && { fields: error.fields }),
    })
    return
  }

  console.error(error)
  response.status(500).json({ message: 'An unexpected error occurred' })
}
