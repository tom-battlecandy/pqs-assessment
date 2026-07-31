/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'

import type { TrainingDataResponse } from '../../../shared/contracts/training'
import {
  buildTrainingEventList,
  parseTrainingEventQuery,
  projectTrainingEvents,
} from './events'

const today = '2026-07-31'
const data: TrainingDataResponse = {
  topics: [
    { id: 1, name: 'First aid' },
    { id: 2, name: 'Fire safety' },
  ],
  bookings: [
    {
      id: 1,
      topicId: 1,
      commencingAt: today,
      completedAt: null,
      cancelledAt: null,
    },
    {
      id: 2,
      topicId: 2,
      commencingAt: '2026-08-01',
      completedAt: today,
      cancelledAt: null,
    },
    {
      id: 3,
      topicId: 2,
      commencingAt: '2026-08-02',
      completedAt: null,
      cancelledAt: today,
    },
  ],
  trainingRecords: [
    {
      id: 1,
      topicId: 1,
      awardedAt: '2025-08-01',
      expiresAt: today,
    },
    {
      id: 2,
      topicId: 2,
      awardedAt: '2026-01-01',
      expiresAt: '2026-10-29',
    },
    {
      id: 3,
      topicId: 2,
      awardedAt: '2026-01-02',
      expiresAt: '2026-10-30',
    },
    {
      id: 4,
      topicId: 2,
      awardedAt: '2026-01-03',
      expiresAt: null,
    },
  ],
}

test('keeps today upcoming, archives completed/cancelled immediately, and omits undated expirations', () => {
  const events = projectTrainingEvents(data, today)

  assert.equal(
    events.find((event) => event.eventId === 'booking:1')?.section,
    'upcoming',
  )
  assert.equal(
    events.find((event) => event.eventId === 'expiration:1')?.section,
    'upcoming',
  )
  assert.equal(
    events.find((event) => event.eventId === 'booking:2')?.section,
    'archive',
  )
  assert.equal(
    events.find((event) => event.eventId === 'booking:3')?.section,
    'archive',
  )
  assert.equal(
    events.some((event) => event.eventId === 'expiration:4'),
    false,
  )
})

test('applies URL filters with AND semantics and an inclusive 90-day boundary', () => {
  const filters = parseTrainingEventQuery({
    topic: '2',
    type: 'expiration',
    from: today,
    to: '2026-12-31',
  })
  const page = buildTrainingEventList(data, today, filters)

  assert.deepEqual(
    page.events.map((event) => event.eventId),
    ['expiration:2'],
  )

  const withFuture = buildTrainingEventList(data, today, {
    ...filters,
    includeFutureExpirations: true,
  })
  assert.deepEqual(
    withFuture.events.map((event) => event.eventId),
    ['expiration:2', 'expiration:3'],
  )
})

test('paginates final projected events and resets an out-of-range page to one', () => {
  const page = buildTrainingEventList(data, today, {
    includeArchived: true,
    includeFutureExpirations: true,
    page: 99,
    pageSize: 2,
  })

  assert.equal(page.totalEvents, 10)
  assert.equal(page.totalPages, 5)
  assert.equal(page.page, 1)
  assert.equal(page.events.length, 2)
})
