import type Database from 'better-sqlite3'

import type {
  Booking,
  CreateBookingRequest,
  CreateTrainingRecordRequest,
  Topic,
  TrainingDataResponse,
  TrainingRecord,
  UpdateBookingRequest,
  UpdateTrainingRecordRequest,
} from '../../../shared/contracts/training.js'
import { assertIsoDate, compareIsoDates } from '../../../shared/dates.js'

type BookingRow = {
  id: number
  topic_id: number
  commencing_at: string
  completed_at: string | null
  cancelled_at: string | null
}

type TrainingRecordRow = {
  id: number
  topic_id: number
  awarded_at: string
  expires_at: string | null
}

export class TrainingServiceError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message)
    this.name = 'TrainingServiceError'
  }
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    topicId: row.topic_id,
    commencingAt: row.commencing_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  }
}

function mapTrainingRecord(row: TrainingRecordRow): TrainingRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    awardedAt: row.awarded_at,
    expiresAt: row.expires_at,
  }
}

function ensureTopicExists(database: Database.Database, topicId: number): void {
  const topic = database
    .prepare('SELECT id FROM topics WHERE id = ?')
    .get(topicId)

  if (!topic) {
    throw new TrainingServiceError(400, 'Topic does not exist')
  }
}

function validateTrainingRecordDates(
  awardedAt: string,
  expiresAt: string | null,
  today: string,
): void {
  try {
    assertIsoDate(awardedAt)
    assertIsoDate(today)
    if (expiresAt !== null) assertIsoDate(expiresAt)
  } catch {
    throw new TrainingServiceError(400, 'Dates must use YYYY-MM-DD')
  }

  if (compareIsoDates(awardedAt, today) > 0) {
    throw new TrainingServiceError(400, 'Award date cannot be later than today')
  }

  if (expiresAt !== null && compareIsoDates(expiresAt, awardedAt) < 0) {
    throw new TrainingServiceError(
      400,
      'Expiration date cannot be before award date',
    )
  }
}

function getOwnedBooking(
  database: Database.Database,
  userId: number,
  bookingId: number,
): Booking {
  const row = database
    .prepare(
      `SELECT id, topic_id, commencing_at, completed_at, cancelled_at
       FROM training_bookings
       WHERE id = ? AND user_id = ?`,
    )
    .get(bookingId, userId) as BookingRow | undefined

  if (!row) {
    throw new TrainingServiceError(404, 'Booking not found')
  }

  return mapBooking(row)
}

function getOwnedTrainingRecord(
  database: Database.Database,
  userId: number,
  trainingRecordId: number,
): TrainingRecord {
  const row = database
    .prepare(
      `SELECT id, topic_id, awarded_at, expires_at
       FROM training_records
       WHERE id = ? AND user_id = ?`,
    )
    .get(trainingRecordId, userId) as TrainingRecordRow | undefined

  if (!row) {
    throw new TrainingServiceError(404, 'Training record not found')
  }

  return mapTrainingRecord(row)
}

export function listTopics(database: Database.Database): Topic[] {
  return database
    .prepare('SELECT id, name FROM topics ORDER BY name, id')
    .all() as Topic[]
}

export function listBookings(
  database: Database.Database,
  userId: number,
): Booking[] {
  const rows = database
    .prepare(
      `SELECT id, topic_id, commencing_at, completed_at, cancelled_at
       FROM training_bookings
       WHERE user_id = ?
       ORDER BY id`,
    )
    .all(userId) as BookingRow[]

  return rows.map(mapBooking)
}

export function listTrainingRecords(
  database: Database.Database,
  userId: number,
): TrainingRecord[] {
  const rows = database
    .prepare(
      `SELECT id, topic_id, awarded_at, expires_at
       FROM training_records
       WHERE user_id = ?
       ORDER BY id`,
    )
    .all(userId) as TrainingRecordRow[]

  return rows.map(mapTrainingRecord)
}

export function getTrainingData(
  database: Database.Database,
  userId: number,
): TrainingDataResponse {
  return {
    topics: listTopics(database),
    bookings: listBookings(database, userId),
    trainingRecords: listTrainingRecords(database, userId),
  }
}

export function createBooking(
  database: Database.Database,
  userId: number,
  input: CreateBookingRequest,
): Booking {
  ensureTopicExists(database, input.topicId)

  const result = database
    .prepare(
      `INSERT INTO training_bookings (
         user_id, topic_id, commencing_at, completed_at, cancelled_at
       )
       VALUES (?, ?, ?, NULL, NULL)`,
    )
    .run(userId, input.topicId, input.commencingAt)

  return getOwnedBooking(database, userId, Number(result.lastInsertRowid))
}

export function updateBooking(
  database: Database.Database,
  userId: number,
  bookingId: number,
  input: UpdateBookingRequest,
): Booking {
  getOwnedBooking(database, userId, bookingId)
  ensureTopicExists(database, input.topicId)

  database
    .prepare(
      `UPDATE training_bookings
       SET topic_id = ?, commencing_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(input.topicId, input.commencingAt, bookingId, userId)

  return getOwnedBooking(database, userId, bookingId)
}

function transitionBooking(
  database: Database.Database,
  userId: number,
  bookingId: number,
  field: 'completed_at' | 'cancelled_at',
  today: string,
): Booking {
  assertIsoDate(today)

  const result = database
    .prepare(
      `UPDATE training_bookings
       SET ${field} = ?
       WHERE id = ?
         AND user_id = ?
         AND completed_at IS NULL
         AND cancelled_at IS NULL`,
    )
    .run(today, bookingId, userId)

  if (result.changes === 0) {
    const booking = getOwnedBooking(database, userId, bookingId)
    const state = booking.completedAt === null ? 'cancelled' : 'completed'
    throw new TrainingServiceError(409, `Booking has already been ${state}`)
  }

  return getOwnedBooking(database, userId, bookingId)
}

export function completeBooking(
  database: Database.Database,
  userId: number,
  bookingId: number,
  today: string,
): Booking {
  return transitionBooking(database, userId, bookingId, 'completed_at', today)
}

export function cancelBooking(
  database: Database.Database,
  userId: number,
  bookingId: number,
  today: string,
): Booking {
  return transitionBooking(database, userId, bookingId, 'cancelled_at', today)
}

export function createTrainingRecord(
  database: Database.Database,
  userId: number,
  input: CreateTrainingRecordRequest,
  today: string,
): TrainingRecord {
  ensureTopicExists(database, input.topicId)
  validateTrainingRecordDates(input.awardedAt, input.expiresAt, today)

  const result = database
    .prepare(
      `INSERT INTO training_records (
         user_id, topic_id, awarded_at, expires_at
       )
       VALUES (?, ?, ?, ?)`,
    )
    .run(userId, input.topicId, input.awardedAt, input.expiresAt)

  return getOwnedTrainingRecord(
    database,
    userId,
    Number(result.lastInsertRowid),
  )
}

export function updateTrainingRecord(
  database: Database.Database,
  userId: number,
  trainingRecordId: number,
  input: UpdateTrainingRecordRequest,
  today: string,
): TrainingRecord {
  getOwnedTrainingRecord(database, userId, trainingRecordId)
  ensureTopicExists(database, input.topicId)
  validateTrainingRecordDates(input.awardedAt, input.expiresAt, today)

  database
    .prepare(
      `UPDATE training_records
       SET topic_id = ?, awarded_at = ?, expires_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      input.topicId,
      input.awardedAt,
      input.expiresAt,
      trainingRecordId,
      userId,
    )

  return getOwnedTrainingRecord(database, userId, trainingRecordId)
}
