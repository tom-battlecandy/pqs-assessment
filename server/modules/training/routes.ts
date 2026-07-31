import type Database from 'better-sqlite3'
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'

import {
  bookingsResponseSchema,
  cancelBookingResponseSchema,
  completeBookingResponseSchema,
  createBookingRequestSchema,
  createBookingResponseSchema,
  createTrainingRecordRequestSchema,
  createTrainingRecordResponseSchema,
  topicsResponseSchema,
  trainingDataResponseSchema,
  trainingRecordsResponseSchema,
  updateBookingRequestSchema,
  updateBookingResponseSchema,
  updateTrainingRecordRequestSchema,
  updateTrainingRecordResponseSchema,
} from '../../../shared/contracts/training.js'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  createTrainingRecord,
  getTrainingData,
  listBookings,
  listTopics,
  listTrainingRecords,
  TrainingServiceError,
  updateBooking,
  updateTrainingRecord,
} from './service.js'

const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

type TrainingRouterOptions = {
  database: Database.Database
  resolveUserId: (request: Request) => number | null | undefined
  today: () => string
}

function validationError(response: Response, error: z.ZodError): void {
  response.status(400).json({
    error: {
      message: 'Invalid request',
      fields: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  })
}

export function createTrainingRouter(options: TrainingRouterOptions): Router {
  const router = Router()

  router.use((request, response, next) => {
    const userId = options.resolveUserId(request)
    if (!userId) {
      response
        .status(401)
        .json({ error: { message: 'Authentication required' } })
      return
    }

    response.locals.userId = userId
    next()
  })

  router.get('/', (_request, response) => {
    const data = getTrainingData(options.database, response.locals.userId)
    response.json(trainingDataResponseSchema.parse(data))
  })

  router.get('/topics', (_request, response) => {
    const data = { topics: listTopics(options.database) }
    response.json(topicsResponseSchema.parse(data))
  })

  router.get('/bookings', (_request, response) => {
    const data = {
      bookings: listBookings(options.database, response.locals.userId),
    }
    response.json(bookingsResponseSchema.parse(data))
  })

  router.post('/bookings', (request, response) => {
    const input = createBookingRequestSchema.parse(request.body)
    const data = {
      booking: createBooking(options.database, response.locals.userId, input),
    }
    response.status(201).json(createBookingResponseSchema.parse(data))
  })

  router.patch('/bookings/:id', (request, response) => {
    const { id } = idParamsSchema.parse(request.params)
    const input = updateBookingRequestSchema.parse(request.body)
    const data = {
      booking: updateBooking(
        options.database,
        response.locals.userId,
        id,
        input,
      ),
    }
    response.json(updateBookingResponseSchema.parse(data))
  })

  router.post('/bookings/:id/complete', (request, response) => {
    const { id } = idParamsSchema.parse(request.params)
    const data = {
      booking: completeBooking(
        options.database,
        response.locals.userId,
        id,
        options.today(),
      ),
    }
    response.json(completeBookingResponseSchema.parse(data))
  })

  router.post('/bookings/:id/cancel', (request, response) => {
    const { id } = idParamsSchema.parse(request.params)
    const data = {
      booking: cancelBooking(
        options.database,
        response.locals.userId,
        id,
        options.today(),
      ),
    }
    response.json(cancelBookingResponseSchema.parse(data))
  })

  router.get('/training-records', (_request, response) => {
    const data = {
      trainingRecords: listTrainingRecords(
        options.database,
        response.locals.userId,
      ),
    }
    response.json(trainingRecordsResponseSchema.parse(data))
  })

  router.post('/training-records', (request, response) => {
    const input = createTrainingRecordRequestSchema.parse(request.body)
    const data = {
      trainingRecord: createTrainingRecord(
        options.database,
        response.locals.userId,
        input,
        options.today(),
      ),
    }
    response.status(201).json(createTrainingRecordResponseSchema.parse(data))
  })

  router.patch('/training-records/:id', (request, response) => {
    const { id } = idParamsSchema.parse(request.params)
    const input = updateTrainingRecordRequestSchema.parse(request.body)
    const data = {
      trainingRecord: updateTrainingRecord(
        options.database,
        response.locals.userId,
        id,
        input,
        options.today(),
      ),
    }
    response.json(updateTrainingRecordResponseSchema.parse(data))
  })

  router.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: (error?: unknown) => void,
    ) => {
      if (error instanceof z.ZodError) {
        validationError(response, error)
        return
      }

      if (error instanceof TrainingServiceError) {
        response.status(error.status).json({
          error: { message: error.message },
        })
        return
      }

      next(error)
    },
  )

  return router
}
