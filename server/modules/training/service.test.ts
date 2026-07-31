import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { beforeEach } from 'node:test'

import Database from 'better-sqlite3'

import {
  cancelBooking,
  completeBooking,
  createBooking,
  createTrainingRecord,
  getTrainingData,
  listTrainingRecords,
  TrainingServiceError,
  updateBooking,
  updateTrainingRecord,
} from './service.js'

let database: Database.Database

beforeEach(() => {
  database = new Database(':memory:')
  database.pragma('foreign_keys = ON')
  database.exec(
    readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8'),
  )
  database.exec(`
    INSERT INTO companies (id, name, email_domain)
    VALUES (1, 'Example', 'example.test');

    INSERT INTO users (
      id, name, email, password_hash, email_verified_at, company_id
    )
    VALUES
      (1, 'One', 'one@example.test', 'hash', '2026-07-31T09:00:00Z', 1),
      (2, 'Two', 'two@example.test', 'hash', '2026-07-31T09:00:00Z', 1);

    INSERT INTO topics (id, name)
    VALUES (1, 'First Aid'), (2, 'Fire Safety');

    INSERT INTO training_bookings (
      id, user_id, topic_id, commencing_at, completed_at, cancelled_at
    )
    VALUES
      (1, 1, 1, '2026-08-10', NULL, NULL),
      (2, 2, 2, '2026-08-11', NULL, NULL);

    INSERT INTO training_records (
      id, user_id, topic_id, awarded_at, expires_at
    )
    VALUES
      (1, 1, 1, '2026-01-01', '2027-01-01'),
      (2, 2, 2, '2026-02-01', NULL);
  `)
})

test('returns raw topics and only the current user training data', () => {
  const data = getTrainingData(database, 1)

  assert.deepEqual(
    data.topics.map((topic) => topic.id),
    [2, 1],
  )
  assert.deepEqual(
    data.bookings.map((booking) => booking.id),
    [1],
  )
  assert.deepEqual(
    data.trainingRecords.map((record) => record.id),
    [1],
  )
})

test('creates open bookings for the supplied session owner', () => {
  const booking = createBooking(database, 1, {
    topicId: 2,
    commencingAt: '2026-09-01',
  })

  assert.deepEqual(
    {
      topicId: booking.topicId,
      completedAt: booking.completedAt,
      cancelledAt: booking.cancelledAt,
    },
    { topicId: 2, completedAt: null, cancelledAt: null },
  )
  assert.equal(
    database
      .prepare('SELECT user_id FROM training_bookings WHERE id = ?')
      .pluck()
      .get(booking.id),
    1,
  )
})

test('edits booking fields without changing owner or transition state', () => {
  database
    .prepare(
      `UPDATE training_bookings SET completed_at = '2026-07-30'
       WHERE id = 1`,
    )
    .run()

  const booking = updateBooking(database, 1, 1, {
    topicId: 2,
    commencingAt: '2026-09-02',
  })

  assert.equal(booking.completedAt, '2026-07-30')
  assert.deepEqual(
    database
      .prepare(
        `SELECT user_id, topic_id, commencing_at
         FROM training_bookings WHERE id = 1`,
      )
      .get(),
    { user_id: 1, topic_id: 2, commencing_at: '2026-09-02' },
  )
  assert.throws(
    () =>
      updateBooking(database, 1, 2, {
        topicId: 1,
        commencingAt: '2026-09-03',
      }),
    (error) => error instanceof TrainingServiceError && error.status === 404,
  )
})

test('completes only an open owned booking and creates no certification', () => {
  const completed = completeBooking(database, 1, 1, '2026-07-31')

  assert.equal(completed.completedAt, '2026-07-31')
  assert.equal(completed.cancelledAt, null)
  assert.equal(listTrainingRecords(database, 1).length, 1)
  assert.throws(
    () => completeBooking(database, 1, 1, '2026-07-31'),
    (error) => error instanceof TrainingServiceError && error.status === 409,
  )
  assert.throws(
    () => cancelBooking(database, 1, 1, '2026-07-31'),
    (error) => error instanceof TrainingServiceError && error.status === 409,
  )
})

test('cancels only an open owned booking', () => {
  const cancelled = cancelBooking(database, 1, 1, '2026-07-31')

  assert.equal(cancelled.completedAt, null)
  assert.equal(cancelled.cancelledAt, '2026-07-31')
  assert.throws(
    () => cancelBooking(database, 1, 1, '2026-07-31'),
    (error) => error instanceof TrainingServiceError && error.status === 409,
  )
})

test('creates and edits certifications without changing owner', () => {
  const record = createTrainingRecord(
    database,
    1,
    {
      topicId: 2,
      awardedAt: '2026-07-31',
      expiresAt: '2027-07-31',
    },
    '2026-07-31',
  )
  const updated = updateTrainingRecord(
    database,
    1,
    record.id,
    {
      topicId: 1,
      awardedAt: '2026-07-30',
      expiresAt: null,
    },
    '2026-07-31',
  )

  assert.equal(updated.expiresAt, null)
  assert.deepEqual(
    database
      .prepare(
        `SELECT user_id, topic_id, awarded_at, expires_at
         FROM training_records WHERE id = ?`,
      )
      .get(record.id),
    {
      user_id: 1,
      topic_id: 1,
      awarded_at: '2026-07-30',
      expires_at: null,
    },
  )
  assert.throws(
    () =>
      updateTrainingRecord(
        database,
        1,
        2,
        { topicId: 1, awardedAt: '2026-01-01', expiresAt: null },
        '2026-07-31',
      ),
    (error) => error instanceof TrainingServiceError && error.status === 404,
  )
})

test('rejects future awards and expiration before award', () => {
  assert.throws(
    () =>
      createTrainingRecord(
        database,
        1,
        { topicId: 1, awardedAt: '2026-08-01', expiresAt: null },
        '2026-07-31',
      ),
    /Award date cannot be later than today/,
  )
  assert.throws(
    () =>
      createTrainingRecord(
        database,
        1,
        {
          topicId: 1,
          awardedAt: '2026-07-31',
          expiresAt: '2026-07-30',
        },
        '2026-07-31',
      ),
    /Expiration date cannot be before award date/,
  )
})
