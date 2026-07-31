/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  Booking,
  TrainingDataResponse,
  TrainingRecord,
} from '../../../shared/contracts/training'
import { buildDashboardTrainingSummaries } from './summary'

const bookings: Booking[] = [
  {
    id: 1,
    topicId: 1,
    commencingAt: '2025-01-01',
    completedAt: null,
    cancelledAt: null,
  },
  ...Array.from({ length: 6 }, (_, index): Booking => ({
    id: index + 2,
    topicId: 1,
    commencingAt: `2025-02-${String(index + 2).padStart(2, '0')}`,
    completedAt: null,
    cancelledAt: null,
  })),
  {
    id: 8,
    topicId: 1,
    commencingAt: '2025-02-01',
    completedAt: '2025-02-01',
    cancelledAt: null,
  },
]

const trainingRecords: TrainingRecord[] = [
  {
    id: 1,
    topicId: 1,
    awardedAt: '2024-01-01',
    expiresAt: '2025-01-31',
  },
  {
    id: 2,
    topicId: 1,
    awardedAt: '2024-01-01',
    expiresAt: '2025-02-01',
  },
  {
    id: 3,
    topicId: 1,
    awardedAt: '2024-01-01',
    expiresAt: '2025-05-02',
  },
  {
    id: 4,
    topicId: 1,
    awardedAt: '2024-01-01',
    expiresAt: '2025-05-03',
  },
  {
    id: 5,
    topicId: 1,
    awardedAt: '2024-01-01',
    expiresAt: null,
  },
]

const data: TrainingDataResponse = {
  topics: [{ id: 1, name: 'Safety' }],
  bookings,
  trainingRecords,
}

test('counts all open bookings and lists the next five including overdue', () => {
  const summary = buildDashboardTrainingSummaries(data, '2025-02-01').bookings

  assert.equal(summary.totalEvents, 7)
  assert.equal(summary.events.length, 5)
  assert.equal(summary.events[0]?.status, 'overdue')
  assert.deepEqual(
    summary.events.map((event) => event.sourceId),
    [1, 2, 3, 4, 5],
  )
})

test('includes expirations from today through day 90 inclusive', () => {
  const summary = buildDashboardTrainingSummaries(
    data,
    '2025-02-01',
  ).expirations

  assert.equal(summary.totalEvents, 2)
  assert.deepEqual(
    summary.events.map((event) => event.sourceId),
    [2, 3],
  )
})
