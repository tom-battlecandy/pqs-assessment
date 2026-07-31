const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export const expirationWindowDays = 90

export function assertIsoDate(value: string): void {
  if (!isoDatePattern.test(value)) {
    throw new RangeError(`Invalid ISO date: ${value}`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid ISO date: ${value}`)
  }
}

export function compareIsoDates(left: string, right: string): number {
  assertIsoDate(left)
  assertIsoDate(right)
  return left < right ? -1 : left > right ? 1 : 0
}

export function addIsoDateDays(date: string, days: number): string {
  assertIsoDate(date)

  if (!Number.isInteger(days)) {
    throw new RangeError('Days must be an integer')
  }

  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return result.toISOString().slice(0, 10)
}

export function isBeforeToday(date: string, today: string): boolean {
  return compareIsoDates(date, today) < 0
}

export function isTodayOrLater(date: string, today: string): boolean {
  return compareIsoDates(date, today) >= 0
}

export function getInclusiveExpirationWindow(today: string): {
  from: string
  to: string
} {
  assertIsoDate(today)

  return {
    from: today,
    to: addIsoDateDays(today, expirationWindowDays),
  }
}

export function isWithinInclusiveExpirationWindow(
  expiresAt: string,
  today: string,
): boolean {
  const window = getInclusiveExpirationWindow(today)
  return (
    compareIsoDates(expiresAt, window.from) >= 0 &&
    compareIsoDates(expiresAt, window.to) <= 0
  )
}

export function isAfterInclusiveExpirationWindow(
  expiresAt: string,
  today: string,
): boolean {
  return compareIsoDates(expiresAt, getInclusiveExpirationWindow(today).to) > 0
}
