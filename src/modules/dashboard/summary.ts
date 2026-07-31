import type {
  IsoDate,
  TrainingDataResponse,
} from '../../../shared/contracts/training'
import { buildTrainingEventList, type TrainingEvent } from '../training/events'

export interface DashboardTrainingSummary {
  events: TrainingEvent[]
  totalEvents: number
}

export interface DashboardTrainingSummaries {
  bookings: DashboardTrainingSummary
  expirations: DashboardTrainingSummary
}

const dashboardEventLimit = 5

export function buildDashboardTrainingSummaries(
  data: TrainingDataResponse,
  today: IsoDate,
): DashboardTrainingSummaries {
  const bookings = buildTrainingEventList(data, today, {
    type: 'booking',
    pageSize: dashboardEventLimit,
  })
  const expirations = buildTrainingEventList(data, today, {
    type: 'expiration',
    from: today,
    pageSize: dashboardEventLimit,
  })

  return {
    bookings: {
      events: bookings.events,
      totalEvents: bookings.totalEvents,
    },
    expirations: {
      events: expirations.events,
      totalEvents: expirations.totalEvents,
    },
  }
}
