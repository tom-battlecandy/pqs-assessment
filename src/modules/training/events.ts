import type {
  Booking,
  IsoDate,
  Topic,
  TrainingDataResponse,
  TrainingRecord,
} from '../../../shared/contracts/training'
import {
  assertIsoDate,
  compareIsoDates,
  isAfterInclusiveExpirationWindow,
  isBeforeToday,
} from '../../../shared/dates'

export type TrainingEventType = 'booking' | 'certification' | 'expiration'
export type TrainingEventSection = 'upcoming' | 'archive'
export type TrainingEventStatus =
  'open' | 'overdue' | 'completed' | 'cancelled' | 'awarded' | 'expired'

export interface TrainingEvent {
  eventId: string
  sourceId: number
  sourceType: 'booking' | 'training-record'
  type: TrainingEventType
  topicId: number
  topicName: string
  relevantDate: IsoDate
  status: TrainingEventStatus
  section: TrainingEventSection
}

export interface TrainingEventFilters {
  topic?: number
  type?: TrainingEventType
  from?: IsoDate
  to?: IsoDate
  includeArchived?: boolean
  includeFutureExpirations?: boolean
}

export interface TrainingEventListOptions extends TrainingEventFilters {
  page?: number
  pageSize?: number
}

export interface TrainingEventPage {
  events: TrainingEvent[]
  page: number
  pageSize: number
  totalEvents: number
  totalPages: number
}

export type TrainingEventQuery = URLSearchParams | Record<string, unknown>

export const defaultTrainingEventPage = 1
export const defaultTrainingEventPageSize = 20

const eventTypeOrder: Record<TrainingEventType, number> = {
  expiration: 0,
  certification: 1,
  booking: 2,
}

function getTopicName(
  topicId: number,
  topicsById: ReadonlyMap<number, string>,
): string {
  const topicName = topicsById.get(topicId)

  if (topicName === undefined) {
    throw new RangeError(`Unknown topic ID: ${topicId}`)
  }

  return topicName
}

export function projectBookingEvent(
  booking: Booking,
  topicName: string,
  today: IsoDate,
): TrainingEvent {
  assertIsoDate(today)

  if (booking.completedAt !== null) {
    return {
      eventId: `booking:${booking.id}`,
      sourceId: booking.id,
      sourceType: 'booking',
      type: 'booking',
      topicId: booking.topicId,
      topicName,
      relevantDate: booking.completedAt,
      status: 'completed',
      section: 'archive',
    }
  }

  if (booking.cancelledAt !== null) {
    return {
      eventId: `booking:${booking.id}`,
      sourceId: booking.id,
      sourceType: 'booking',
      type: 'booking',
      topicId: booking.topicId,
      topicName,
      relevantDate: booking.cancelledAt,
      status: 'cancelled',
      section: 'archive',
    }
  }

  const overdue = isBeforeToday(booking.commencingAt, today)

  return {
    eventId: `booking:${booking.id}`,
    sourceId: booking.id,
    sourceType: 'booking',
    type: 'booking',
    topicId: booking.topicId,
    topicName,
    relevantDate: booking.commencingAt,
    status: overdue ? 'overdue' : 'open',
    section: 'upcoming',
  }
}

export function projectTrainingRecordEvents(
  trainingRecord: TrainingRecord,
  topicName: string,
  today: IsoDate,
): TrainingEvent[] {
  assertIsoDate(today)

  const events: TrainingEvent[] = [
    {
      eventId: `certification:${trainingRecord.id}`,
      sourceId: trainingRecord.id,
      sourceType: 'training-record',
      type: 'certification',
      topicId: trainingRecord.topicId,
      topicName,
      relevantDate: trainingRecord.awardedAt,
      status: 'awarded',
      section: 'archive',
    },
  ]

  if (trainingRecord.expiresAt !== null) {
    const expired = isBeforeToday(trainingRecord.expiresAt, today)

    events.push({
      eventId: `expiration:${trainingRecord.id}`,
      sourceId: trainingRecord.id,
      sourceType: 'training-record',
      type: 'expiration',
      topicId: trainingRecord.topicId,
      topicName,
      relevantDate: trainingRecord.expiresAt,
      status: expired ? 'expired' : 'open',
      section: expired ? 'archive' : 'upcoming',
    })
  }

  return events
}

export function projectTrainingEvents(
  data: TrainingDataResponse,
  today: IsoDate,
): TrainingEvent[] {
  assertIsoDate(today)

  const topicsById = new Map<number, string>(
    data.topics.map((topic: Topic) => [topic.id, topic.name]),
  )
  const bookingEvents = data.bookings.map((booking) =>
    projectBookingEvent(
      booking,
      getTopicName(booking.topicId, topicsById),
      today,
    ),
  )
  const trainingRecordEvents = data.trainingRecords.flatMap((trainingRecord) =>
    projectTrainingRecordEvents(
      trainingRecord,
      getTopicName(trainingRecord.topicId, topicsById),
      today,
    ),
  )

  return [...bookingEvents, ...trainingRecordEvents]
}

export function filterTrainingEvents(
  events: readonly TrainingEvent[],
  filters: TrainingEventFilters,
  today: IsoDate,
): TrainingEvent[] {
  assertIsoDate(today)

  return events.filter((event) => {
    if (!filters.includeArchived && event.section === 'archive') {
      return false
    }

    if (
      !filters.includeFutureExpirations &&
      event.type === 'expiration' &&
      isAfterInclusiveExpirationWindow(event.relevantDate, today)
    ) {
      return false
    }

    if (filters.topic !== undefined && event.topicId !== filters.topic) {
      return false
    }

    if (filters.type !== undefined && event.type !== filters.type) {
      return false
    }

    if (
      filters.from !== undefined &&
      compareIsoDates(event.relevantDate, filters.from) < 0
    ) {
      return false
    }

    if (
      filters.to !== undefined &&
      compareIsoDates(event.relevantDate, filters.to) > 0
    ) {
      return false
    }

    return true
  })
}

export function sortTrainingEvents(
  events: readonly TrainingEvent[],
): TrainingEvent[] {
  return [...events].sort((left, right) => {
    if (left.section !== right.section) {
      return left.section === 'upcoming' ? -1 : 1
    }

    const dateOrder = compareIsoDates(left.relevantDate, right.relevantDate)
    if (dateOrder !== 0) {
      return left.section === 'upcoming' ? dateOrder : -dateOrder
    }

    const typeOrder = eventTypeOrder[left.type] - eventTypeOrder[right.type]
    if (typeOrder !== 0) {
      return typeOrder
    }

    return left.eventId < right.eventId
      ? -1
      : left.eventId > right.eventId
        ? 1
        : 0
  })
}

function positiveIntegerOrDefault(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isInteger(value) && value !== undefined && value > 0
    ? value
    : fallback
}

export function paginateTrainingEvents(
  events: readonly TrainingEvent[],
  requestedPage = defaultTrainingEventPage,
  requestedPageSize = defaultTrainingEventPageSize,
): TrainingEventPage {
  const pageSize = positiveIntegerOrDefault(
    requestedPageSize,
    defaultTrainingEventPageSize,
  )
  const totalEvents = events.length
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize))
  const validRequestedPage = positiveIntegerOrDefault(
    requestedPage,
    defaultTrainingEventPage,
  )
  const page =
    validRequestedPage > totalPages
      ? defaultTrainingEventPage
      : validRequestedPage
  const start = (page - 1) * pageSize

  return {
    events: events.slice(start, start + pageSize),
    page,
    pageSize,
    totalEvents,
    totalPages,
  }
}

export function buildTrainingEventList(
  data: TrainingDataResponse,
  today: IsoDate,
  options: TrainingEventListOptions = {},
): TrainingEventPage {
  const projected = projectTrainingEvents(data, today)
  const filtered = filterTrainingEvents(projected, options, today)
  const sorted = sortTrainingEvents(filtered)

  return paginateTrainingEvents(sorted, options.page, options.pageSize)
}

function queryValue(query: TrainingEventQuery, key: string): unknown {
  return query instanceof URLSearchParams ? query.get(key) : query[key]
}

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function parsePositiveInteger(value: unknown): number | undefined {
  const candidate = firstQueryValue(value)

  if (typeof candidate === 'number') {
    return Number.isInteger(candidate) && candidate > 0 ? candidate : undefined
  }

  if (typeof candidate !== 'string' || !/^[1-9]\d*$/.test(candidate)) {
    return undefined
  }

  const parsed = Number(candidate)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function parseDate(value: unknown): IsoDate | undefined {
  const candidate = firstQueryValue(value)

  if (typeof candidate !== 'string') {
    return undefined
  }

  try {
    assertIsoDate(candidate)
    return candidate
  } catch {
    return undefined
  }
}

export function parseTrainingEventQuery(
  query: TrainingEventQuery,
): TrainingEventListOptions {
  const typeValue = firstQueryValue(queryValue(query, 'type'))
  const type =
    typeValue === 'booking' ||
    typeValue === 'certification' ||
    typeValue === 'expiration'
      ? typeValue
      : undefined

  return {
    topic: parsePositiveInteger(queryValue(query, 'topic')),
    type,
    from: parseDate(queryValue(query, 'from')),
    to: parseDate(queryValue(query, 'to')),
    includeArchived:
      firstQueryValue(queryValue(query, 'includeArchived')) === 'true',
    includeFutureExpirations:
      firstQueryValue(queryValue(query, 'includeFutureExpirations')) === 'true',
    page:
      parsePositiveInteger(queryValue(query, 'page')) ??
      defaultTrainingEventPage,
    pageSize:
      parsePositiveInteger(queryValue(query, 'pageSize')) ??
      defaultTrainingEventPageSize,
  }
}
