import Database from 'better-sqlite3'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { AppError } from '../../shared/errors.js'
import { createAccountService } from './service.js'

function createDatabase() {
  const database = new Database(':memory:')
  database.pragma('foreign_keys = ON')
  database.exec(
    readFileSync(
      fileURLToPath(new URL('../../db/schema.sql', import.meta.url)),
      'utf8',
    ),
  )
  return database
}

function silenceMail() {
  const original = console.log
  console.log = () => undefined
  return () => {
    console.log = original
  }
}

test('normalises domains and blocks only the specified consumer domains', () => {
  const database = createDatabase()
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
  })

  assert.deepEqual(service.lookupDomain(' Person@Company.Test '), {
    claimed: false,
    companyName: null,
  })
  assert.throws(
    () => service.lookupDomain('person@GMAIL.com'),
    (error) => error instanceof AppError && error.status === 422,
  )
  assert.deepEqual(service.lookupDomain('person@mail.gmail.com'), {
    claimed: false,
    companyName: null,
  })
  database.close()
})

test('first verifier atomically claims a domain and later verifier joins it', () => {
  const database = createDatabase()
  const tokens = ['first-token', 'second-token']
  const restoreMail = silenceMail()
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
    now: () => new Date('2026-07-31T12:00:00.000Z'),
    token: () => tokens.shift()!,
    sessionId: (() => {
      let id = 0
      return () => `session-${++id}`
    })(),
  })

  try {
    service.register({
      name: 'First',
      email: 'FIRST@Example.Test',
      password: 'password-one',
      passwordConfirmation: 'password-one',
      companyName: 'First Company',
    })
    service.register({
      name: 'Second',
      email: 'second@example.test',
      password: 'password-two',
      passwordConfirmation: 'password-two',
      companyName: 'Second Company',
    })

    const first = service.verifyEmail('first-token')
    const second = service.verifyEmail('second-token')

    assert.equal(first.user.company.name, 'First Company')
    assert.equal(second.user.company.id, first.user.company.id)
    assert.equal(second.user.company.name, 'First Company')
    assert.equal(
      (
        database
          .prepare(
            'SELECT count(*) AS count FROM companies WHERE email_domain = ?',
          )
          .get('example.test') as { count: number }
      ).count,
      1,
    )
    assert.deepEqual(
      database
        .prepare(
          `SELECT email, pending_company_name
           FROM users ORDER BY email`,
        )
        .all(),
      [
        { email: 'first@example.test', pending_company_name: null },
        { email: 'second@example.test', pending_company_name: null },
      ],
    )
  } finally {
    restoreMail()
    database.close()
  }
})

test('unverified users cannot sign in and replacement verification is single-use', () => {
  const database = createDatabase()
  const tokens = ['original-token', 'replacement-token']
  const restoreMail = silenceMail()
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
    now: () => new Date('2026-07-31T12:00:00.000Z'),
    token: () => tokens.shift()!,
  })

  try {
    service.register({
      name: 'Pending',
      email: 'pending@example.test',
      password: 'password-one',
      passwordConfirmation: 'password-one',
      companyName: 'Example',
    })
    assert.throws(
      () => service.signIn('pending@example.test', 'password-one'),
      (error) => error instanceof AppError && error.status === 401,
    )

    service.resendVerification('PENDING@EXAMPLE.TEST')
    assert.throws(
      () => service.verifyEmail('original-token'),
      (error) => error instanceof AppError && error.status === 400,
    )
    assert.equal(
      service.verifyEmail('replacement-token').user.email,
      'pending@example.test',
    )
  } finally {
    restoreMail()
    database.close()
  }
})

test('password reset response is generic and reset tokens revoke sessions', () => {
  const database = createDatabase()
  const tokens = ['verification-token', 'reset-token']
  const restoreMail = silenceMail()
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
    now: () => new Date('2026-07-31T12:00:00.000Z'),
    token: () => tokens.shift()!,
    sessionId: (() => {
      let id = 0
      return () => `session-${++id}`
    })(),
  })

  try {
    service.register({
      name: 'Person',
      email: 'person@example.test',
      password: 'old-password',
      passwordConfirmation: 'old-password',
      companyName: 'Example',
    })
    service.verifyEmail('verification-token')
    service.signIn('person@example.test', 'old-password')

    assert.deepEqual(
      service.requestPasswordReset('missing@example.test'),
      service.requestPasswordReset('PERSON@EXAMPLE.TEST'),
    )
    service.resetPassword('reset-token', 'new-password')

    assert.equal(
      (
        database.prepare('SELECT count(*) AS count FROM sessions').get() as {
          count: number
        }
      ).count,
      0,
    )
    assert.throws(
      () => service.resetPassword('reset-token', 'another-password'),
      (error) => error instanceof AppError && error.status === 400,
    )
    assert.equal(
      service.signIn('person@example.test', 'new-password').user.name,
      'Person',
    )
  } finally {
    restoreMail()
    database.close()
  }
})

test('password change preserves only the current session', () => {
  const database = createDatabase()
  const restoreMail = silenceMail()
  let nextSession = 0
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
    now: () => new Date('2026-07-31T12:00:00.000Z'),
    token: () => 'verification-token',
    sessionId: () => `session-${++nextSession}`,
  })

  try {
    service.register({
      name: 'Person',
      email: 'person@example.test',
      password: 'old-password',
      passwordConfirmation: 'old-password',
      companyName: 'Example',
    })
    const verified = service.verifyEmail('verification-token')
    const current = service.signIn('person@example.test', 'old-password')

    service.changePassword(
      current.user.id,
      current.sessionId,
      'old-password',
      'new-password',
    )

    assert.deepEqual(
      database.prepare('SELECT id FROM sessions ORDER BY id').all(),
      [{ id: current.sessionId }],
    )
    assert.notEqual(current.sessionId, verified.sessionId)
    assert.throws(
      () => service.signIn('person@example.test', 'old-password'),
      (error) => error instanceof AppError && error.status === 401,
    )
    assert.equal(
      service.signIn('person@example.test', 'new-password').user.email,
      'person@example.test',
    )
  } finally {
    restoreMail()
    database.close()
  }
})

test('sign in is blocked after five failures in fifteen minutes', () => {
  const database = createDatabase()
  const restoreMail = silenceMail()
  const service = createAccountService(database, {
    clientOrigin: 'http://client.test',
    now: () => new Date('2026-07-31T12:00:00.000Z'),
    token: () => 'verification-token',
  })

  try {
    service.register({
      name: 'Person',
      email: 'person@example.test',
      password: 'right-password',
      passwordConfirmation: 'right-password',
      companyName: 'Example',
    })
    service.verifyEmail('verification-token')

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.throws(
        () => service.signIn('person@example.test', 'wrong-password'),
        (error) => error instanceof AppError && error.status === 401,
      )
    }
    assert.throws(
      () => service.signIn('person@example.test', 'right-password'),
      (error) => error instanceof AppError && error.status === 429,
    )
  } finally {
    restoreMail()
    database.close()
  }
})
