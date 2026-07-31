import { z } from 'zod'

export const isoDateSchema = z.iso.date()

export const topicSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(250),
  })
  .strict()

export const bookingSchema = z
  .object({
    id: z.number().int().positive(),
    topicId: z.number().int().positive(),
    commencingAt: isoDateSchema,
    completedAt: isoDateSchema.nullable(),
    cancelledAt: isoDateSchema.nullable(),
  })
  .strict()
  .refine((value) => value.completedAt === null || value.cancelledAt === null, {
    message: 'A booking cannot be both completed and cancelled',
    path: ['cancelledAt'],
  })

export const trainingRecordSchema = z
  .object({
    id: z.number().int().positive(),
    topicId: z.number().int().positive(),
    awardedAt: isoDateSchema,
    expiresAt: isoDateSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => value.expiresAt === null || value.expiresAt >= value.awardedAt,
    {
      message: 'Expiration date cannot be before award date',
      path: ['expiresAt'],
    },
  )

export const topicsResponseSchema = z
  .object({
    topics: z.array(topicSchema),
  })
  .strict()

export const bookingsResponseSchema = z
  .object({
    bookings: z.array(bookingSchema),
  })
  .strict()

export const trainingRecordsResponseSchema = z
  .object({
    trainingRecords: z.array(trainingRecordSchema),
  })
  .strict()

export const trainingDataResponseSchema = z
  .object({
    topics: z.array(topicSchema),
    bookings: z.array(bookingSchema),
    trainingRecords: z.array(trainingRecordSchema),
  })
  .strict()

export const createBookingRequestSchema = z
  .object({
    topicId: z.number().int().positive(),
    commencingAt: isoDateSchema,
  })
  .strict()

export const updateBookingRequestSchema = createBookingRequestSchema

export const bookingResponseSchema = z
  .object({
    booking: bookingSchema,
  })
  .strict()

export const createBookingResponseSchema = bookingResponseSchema
export const updateBookingResponseSchema = bookingResponseSchema
export const completeBookingResponseSchema = bookingResponseSchema
export const cancelBookingResponseSchema = bookingResponseSchema

const trainingRecordMutationSchema = z
  .object({
    topicId: z.number().int().positive(),
    awardedAt: isoDateSchema,
    expiresAt: isoDateSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => value.expiresAt === null || value.expiresAt >= value.awardedAt,
    {
      message: 'Expiration date cannot be before award date',
      path: ['expiresAt'],
    },
  )

export const createTrainingRecordRequestSchema = trainingRecordMutationSchema
export const updateTrainingRecordRequestSchema = trainingRecordMutationSchema

export const trainingRecordResponseSchema = z
  .object({
    trainingRecord: trainingRecordSchema,
  })
  .strict()

export const createTrainingRecordResponseSchema = trainingRecordResponseSchema
export const updateTrainingRecordResponseSchema = trainingRecordResponseSchema

export type IsoDate = z.infer<typeof isoDateSchema>
export type Topic = z.infer<typeof topicSchema>
export type Booking = z.infer<typeof bookingSchema>
export type TrainingRecord = z.infer<typeof trainingRecordSchema>
export type TopicsResponse = z.infer<typeof topicsResponseSchema>
export type BookingsResponse = z.infer<typeof bookingsResponseSchema>
export type TrainingRecordsResponse = z.infer<
  typeof trainingRecordsResponseSchema
>
export type TrainingDataResponse = z.infer<typeof trainingDataResponseSchema>
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>
export type UpdateBookingRequest = z.infer<typeof updateBookingRequestSchema>
export type BookingResponse = z.infer<typeof bookingResponseSchema>
export type CreateBookingResponse = z.infer<typeof createBookingResponseSchema>
export type UpdateBookingResponse = z.infer<typeof updateBookingResponseSchema>
export type CompleteBookingResponse = z.infer<
  typeof completeBookingResponseSchema
>
export type CancelBookingResponse = z.infer<typeof cancelBookingResponseSchema>
export type CreateTrainingRecordRequest = z.infer<
  typeof createTrainingRecordRequestSchema
>
export type UpdateTrainingRecordRequest = z.infer<
  typeof updateTrainingRecordRequestSchema
>
export type TrainingRecordResponse = z.infer<
  typeof trainingRecordResponseSchema
>
export type CreateTrainingRecordResponse = z.infer<
  typeof createTrainingRecordResponseSchema
>
export type UpdateTrainingRecordResponse = z.infer<
  typeof updateTrainingRecordResponseSchema
>
