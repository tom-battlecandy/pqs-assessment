import {
  bookingResponseSchema,
  bookingsResponseSchema,
  topicsResponseSchema,
  trainingDataResponseSchema,
  trainingRecordResponseSchema,
  trainingRecordsResponseSchema,
  type Booking,
  type BookingsResponse,
  type CreateBookingRequest,
  type CreateTrainingRecordRequest,
  type TopicsResponse,
  type TrainingRecord,
  type TrainingRecordsResponse,
  type UpdateBookingRequest,
  type UpdateTrainingRecordRequest,
} from '../../../shared/contracts/training'
import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/vue-query'
import type { z } from 'zod'

export type TrainingFieldErrors = Record<string, string[]>

export class TrainingApiError extends Error {
  readonly fieldErrors: TrainingFieldErrors
  readonly status: number

  constructor(
    message: string,
    status: number,
    fieldErrors: TrainingFieldErrors = {},
  ) {
    super(message)
    this.name = 'TrainingApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function readFieldErrors(payload: unknown): TrainingFieldErrors {
  if (!payload || typeof payload !== 'object') return {}

  const error = 'error' in payload ? payload.error : payload
  if (!error || typeof error !== 'object' || !('fields' in error)) return {}
  if (!Array.isArray(error.fields)) return {}

  return error.fields.reduce<TrainingFieldErrors>((errors, field) => {
    if (
      field &&
      typeof field === 'object' &&
      'path' in field &&
      typeof field.path === 'string' &&
      'message' in field &&
      typeof field.message === 'string'
    ) {
      errors[field.path] = [...(errors[field.path] ?? []), field.message]
    }
    return errors
  }, {})
}

function readErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Something went wrong. Please try again.'
  }

  const error = 'error' in payload ? payload.error : payload
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Something went wrong. Please try again.'
}

async function trainingRequest<T>(
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
    throw new TrainingApiError(
      readErrorMessage(payload),
      response.status,
      readFieldErrors(payload),
    )
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new TrainingApiError('The server returned an invalid response.', 500)
  }
  return parsed.data
}

const json = (value: unknown) => JSON.stringify(value)

export const trainingKeys = {
  all: ['training'] as const,
  data: () => [...trainingKeys.all, 'data'] as const,
  topics: () => [...trainingKeys.all, 'topics'] as const,
  bookings: () => [...trainingKeys.all, 'bookings'] as const,
  trainingRecords: () => [...trainingKeys.all, 'training-records'] as const,
}

export const trainingDataQueryOptions = () =>
  queryOptions({
    queryKey: trainingKeys.data(),
    queryFn: getTrainingData,
  })

export const topicsQueryOptions = () =>
  queryOptions({
    queryKey: trainingKeys.topics(),
    queryFn: getTopics,
  })

export const bookingsQueryOptions = () =>
  queryOptions({
    queryKey: trainingKeys.bookings(),
    queryFn: getBookings,
  })

export const trainingRecordsQueryOptions = () =>
  queryOptions({
    queryKey: trainingKeys.trainingRecords(),
    queryFn: getTrainingRecords,
  })

const invalidateTraining = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: trainingKeys.all })

export const createBookingMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: createBooking,
    onSuccess: () => invalidateTraining(queryClient),
  })

export const updateBookingMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({ id, input }: { id: number; input: UpdateBookingRequest }) =>
      updateBooking(id, input),
    onSuccess: () => invalidateTraining(queryClient),
  })

export const completeBookingMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: completeBooking,
    onSuccess: () => invalidateTraining(queryClient),
  })

export const cancelBookingMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: cancelBooking,
    onSuccess: () => invalidateTraining(queryClient),
  })

export const createTrainingRecordMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: createTrainingRecord,
    onSuccess: () => invalidateTraining(queryClient),
  })

export const updateTrainingRecordMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: UpdateTrainingRecordRequest
    }) => updateTrainingRecord(id, input),
    onSuccess: () => invalidateTraining(queryClient),
  })

export const getTrainingData = () =>
  trainingRequest('/api/training', trainingDataResponseSchema)

export const getTopics = (): Promise<TopicsResponse> =>
  trainingRequest('/api/training/topics', topicsResponseSchema)

export const getBookings = (): Promise<BookingsResponse> =>
  trainingRequest('/api/training/bookings', bookingsResponseSchema)

export const getTrainingRecords = (): Promise<TrainingRecordsResponse> =>
  trainingRequest(
    '/api/training/training-records',
    trainingRecordsResponseSchema,
  )

export const createBooking = (input: CreateBookingRequest): Promise<Booking> =>
  trainingRequest('/api/training/bookings', bookingResponseSchema, {
    method: 'POST',
    body: json(input),
  }).then((response) => response.booking)

export const updateBooking = (
  id: number,
  input: UpdateBookingRequest,
): Promise<Booking> =>
  trainingRequest(`/api/training/bookings/${id}`, bookingResponseSchema, {
    method: 'PATCH',
    body: json(input),
  }).then((response) => response.booking)

export const completeBooking = (id: number): Promise<Booking> =>
  trainingRequest(
    `/api/training/bookings/${id}/complete`,
    bookingResponseSchema,
    { method: 'POST' },
  ).then((response) => response.booking)

export const cancelBooking = (id: number): Promise<Booking> =>
  trainingRequest(
    `/api/training/bookings/${id}/cancel`,
    bookingResponseSchema,
    { method: 'POST' },
  ).then((response) => response.booking)

export const createTrainingRecord = (
  input: CreateTrainingRecordRequest,
): Promise<TrainingRecord> =>
  trainingRequest(
    '/api/training/training-records',
    trainingRecordResponseSchema,
    {
      method: 'POST',
      body: json(input),
    },
  ).then((response) => response.trainingRecord)

export const updateTrainingRecord = (
  id: number,
  input: UpdateTrainingRecordRequest,
): Promise<TrainingRecord> =>
  trainingRequest(
    `/api/training/training-records/${id}`,
    trainingRecordResponseSchema,
    { method: 'PATCH', body: json(input) },
  ).then((response) => response.trainingRecord)
