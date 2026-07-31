import { scryptSync } from 'node:crypto'

import { openDatabase, resolveDatabasePath } from './connection.js'

const developmentPassword = 'PqsDemo123!'
const passwordSalt = 'pqs-development-seed'
const passwordHash = [
  'scrypt',
  '16384',
  '8',
  '1',
  passwordSalt,
  scryptSync(developmentPassword, passwordSalt, 64).toString('base64url'),
].join('$')

function isoDateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts()
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value

  return `${part('year')}-${part('month')}-${part('day')}`
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const today = isoDateInTimezone(process.env.APP_TIMEZONE ?? 'Europe/London')
const verifiedAt = `${today}T09:00:00Z`
const database = openDatabase()

const companies = [
  [1, 'Northstar Safety', 'northstar.test'],
  [2, 'Oakfield Engineering', 'oakfield.test'],
  [3, 'Beacon Works', 'beacon.test'],
] as const

const users = [
  [1, 'Alex Morgan', 'alex.morgan@northstar.test', 1],
  [2, 'Priya Shah', 'priya.shah@northstar.test', 1],
  [3, 'Sam Lewis', 'sam.lewis@northstar.test', 1],
  [4, 'Maya Chen', 'maya.chen@oakfield.test', 2],
  [5, 'Theo Evans', 'theo.evans@beacon.test', 3],
] as const

const topics = [
  [1, 'Emergency First Aid at Work'],
  [2, 'Fire Safety Awareness'],
  [3, 'Manual Handling'],
  [4, 'Working at Height'],
  [5, 'COSHH Awareness'],
] as const

const trainingRecords = [
  [1, 1, 1, addDays(today, -335), addDays(today, 30)],
  [2, 1, 3, addDays(today, -100), null],
  [3, 2, 2, addDays(today, -380), addDays(today, -15)],
  [4, 2, 5, addDays(today, -40), addDays(today, 120)],
  [5, 3, 4, addDays(today, -365), today],
  [6, 4, 3, addDays(today, -60), null],
  [7, 5, 1, addDays(today, -275), addDays(today, 90)],
] as const

const bookings = [
  [1, 1, 2, addDays(today, 14), null, null],
  [2, 1, 3, addDays(today, -35), addDays(today, -30), null],
  [3, 1, 5, addDays(today, -10), null, addDays(today, -9)],
  [4, 2, 1, today, null, null],
  [5, 3, 4, addDays(today, 60), null, null],
  [6, 4, 2, addDays(today, -95), addDays(today, -90), null],
  [7, 5, 3, addDays(today, 5), null, null],
] as const

const seed = database.transaction(() => {
  const upsertCompany = database.prepare(`
    INSERT INTO companies (id, name, email_domain)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email_domain = excluded.email_domain
  `)
  for (const company of companies) upsertCompany.run(...company)

  const upsertUser = database.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, email_verified_at, company_id,
      pending_company_name
    )
    VALUES (?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      password_hash = excluded.password_hash,
      email_verified_at = excluded.email_verified_at,
      company_id = excluded.company_id,
      pending_company_name = NULL
  `)
  for (const [id, name, email, companyId] of users) {
    upsertUser.run(id, name, email, passwordHash, verifiedAt, companyId)
  }

  const upsertTopic = database.prepare(`
    INSERT INTO topics (id, name)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `)
  for (const topic of topics) upsertTopic.run(...topic)

  const upsertRecord = database.prepare(`
    INSERT INTO training_records (
      id, user_id, topic_id, awarded_at, expires_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      topic_id = excluded.topic_id,
      awarded_at = excluded.awarded_at,
      expires_at = excluded.expires_at
  `)
  for (const record of trainingRecords) upsertRecord.run(...record)

  const upsertBooking = database.prepare(`
    INSERT INTO training_bookings (
      id, user_id, topic_id, commencing_at, completed_at, cancelled_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      topic_id = excluded.topic_id,
      commencing_at = excluded.commencing_at,
      completed_at = excluded.completed_at,
      cancelled_at = excluded.cancelled_at
  `)
  for (const booking of bookings) upsertBooking.run(...booking)
})

try {
  seed()
} finally {
  database.close()
}

console.log(`Seeded database at ${resolveDatabasePath()}`)
