import type Database from 'better-sqlite3'
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'

import type {
  CurrentUser,
  DomainLookupResponse,
  RegistrationRequest,
} from '../../../shared/contracts/account.js'
import {
  invitationGeneratedMessage,
  passwordResetRequestedMessage,
  verificationEmailGeneratedMessage,
} from '../../../shared/contracts/account.js'
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../../shared/mailer.js'
import { AppError } from '../../shared/errors.js'

const blockedDomains = new Set(['gmail.com', 'outlook.com'])
const verificationLifetimeMs = 24 * 60 * 60 * 1000
const resetLifetimeMs = 60 * 60 * 1000
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000
const failureWindowMs = 15 * 60 * 1000
const maximumFailures = 5

interface UserRow {
  id: number
  name: string
  email: string
  password_hash: string
  email_verified_at: string | null
  company_id: number | null
  pending_company_name: string | null
}

interface CurrentUserRow {
  id: number
  name: string
  email: string
  emailVerifiedAt: string
  companyId: number
  companyName: string
  emailDomain: string
}

interface AccountServiceOptions {
  clientOrigin: string
  now?: () => Date
  token?: () => string
  sessionId?: () => string
}

function normaliseEmail(value: string) {
  return value.trim().toLowerCase()
}

function domainFor(email: string) {
  return email.slice(email.lastIndexOf('@') + 1)
}

function assertAllowedDomain(domain: string) {
  if (blockedDomains.has(domain)) {
    throw new AppError(422, 'Use your company email address', {
      email: ['gmail.com and outlook.com addresses are not allowed'],
    })
  }
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  return [
    'scrypt',
    '16384',
    '8',
    '1',
    salt,
    scryptSync(password, salt, 64).toString('base64url'),
  ].join('$')
}

function passwordMatches(password: string, encoded: string) {
  const [algorithm, cost, blockSize, parallelisation, salt, expected] =
    encoded.split('$')
  if (
    algorithm !== 'scrypt' ||
    !cost ||
    !blockSize ||
    !parallelisation ||
    !salt ||
    !expected
  ) {
    return false
  }

  try {
    const actual = scryptSync(password, salt, 64, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelisation),
    })
    const expectedBuffer = Buffer.from(expected, 'base64url')
    return (
      actual.length === expectedBuffer.length &&
      timingSafeEqual(actual, expectedBuffer)
    )
  } catch {
    return false
  }
}

function asCurrentUser(row: CurrentUserRow): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    company: {
      id: row.companyId,
      name: row.companyName,
      emailDomain: row.emailDomain,
    },
  }
}

export function createAccountService(
  database: Database.Database,
  options: AccountServiceOptions,
) {
  const now = options.now ?? (() => new Date())
  const newToken =
    options.token ?? (() => randomBytes(32).toString('base64url'))
  const newSessionId = options.sessionId ?? randomUUID
  const failures = new Map<string, number[]>()

  function isoNow() {
    return now().toISOString()
  }

  function expiry(milliseconds: number) {
    return new Date(now().getTime() + milliseconds).toISOString()
  }

  function findUserByEmail(email: string) {
    return database
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined
  }

  function currentUser(userId: number) {
    const row = database
      .prepare(
        `SELECT
           users.id,
           users.name,
           users.email,
           users.email_verified_at AS emailVerifiedAt,
           companies.id AS companyId,
           companies.name AS companyName,
           companies.email_domain AS emailDomain
         FROM users
         JOIN companies ON companies.id = users.company_id
         WHERE users.id = ? AND users.email_verified_at IS NOT NULL`,
      )
      .get(userId) as CurrentUserRow | undefined
    if (!row) throw new AppError(401, 'Authentication required')
    return asCurrentUser(row)
  }

  function createSession(userId: number) {
    const id = newSessionId()
    database
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .run(id, userId, expiry(sessionLifetimeMs))
    return id
  }

  function issueVerification(user: UserRow) {
    const issuedToken = newToken()
    const issuedAt = isoNow()
    database
      .prepare(
        `UPDATE email_verification_tokens
         SET used_at = ?
         WHERE user_id = ? AND used_at IS NULL`,
      )
      .run(issuedAt, user.id)
    database
      .prepare(
        `INSERT INTO email_verification_tokens
          (user_id, token_hash, expires_at, used_at)
         VALUES (?, ?, ?, NULL)`,
      )
      .run(user.id, tokenHash(issuedToken), expiry(verificationLifetimeMs))
    sendVerificationEmail(
      user.email,
      `${options.clientOrigin}/verify-email?token=${encodeURIComponent(issuedToken)}`,
    )
  }

  function lookupDomain(emailValue: string): DomainLookupResponse {
    const email = normaliseEmail(emailValue)
    const domain = domainFor(email)
    assertAllowedDomain(domain)
    const company = database
      .prepare('SELECT name FROM companies WHERE email_domain = ?')
      .get(domain) as { name: string } | undefined
    return {
      claimed: Boolean(company),
      companyName: company?.name ?? null,
    }
  }

  function register(input: RegistrationRequest) {
    const email = normaliseEmail(input.email)
    const domain = domainFor(email)
    assertAllowedDomain(domain)
    const company = database
      .prepare('SELECT id FROM companies WHERE email_domain = ?')
      .get(domain) as { id: number } | undefined

    if (!company && !input.companyName) {
      throw new AppError(422, 'Company name is required', {
        companyName: ['Enter your company name'],
      })
    }

    try {
      database
        .prepare(
          `INSERT INTO users
            (name, email, password_hash, email_verified_at, company_id,
             pending_company_name)
           VALUES (?, ?, ?, NULL, NULL, ?)`,
        )
        .run(
          input.name.trim(),
          email,
          hashPassword(input.password),
          company ? null : input.companyName?.trim(),
        )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed: users.email')
      ) {
        throw new AppError(409, 'An account already exists for this email', {
          email: ['An account already exists for this email'],
        })
      }
      throw error
    }

    issueVerification(findUserByEmail(email)!)
    return { message: verificationEmailGeneratedMessage }
  }

  function verifyEmail(token: string) {
    const verify = database.transaction(() => {
      const tokenRow = database
        .prepare(
          `SELECT user_id AS userId
           FROM email_verification_tokens
           WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
        )
        .get(tokenHash(token), isoNow()) as { userId: number } | undefined
      if (!tokenRow) {
        throw new AppError(400, 'Verification link is invalid or expired')
      }

      const user = database
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(tokenRow.userId) as UserRow
      if (user.email_verified_at || user.company_id) {
        throw new AppError(400, 'Verification link is invalid or expired')
      }

      const domain = domainFor(user.email)
      let company = database
        .prepare('SELECT id FROM companies WHERE email_domain = ?')
        .get(domain) as { id: number } | undefined
      if (!company) {
        if (!user.pending_company_name) {
          throw new AppError(409, 'Company details are unavailable')
        }
        const result = database
          .prepare('INSERT INTO companies (name, email_domain) VALUES (?, ?)')
          .run(user.pending_company_name, domain)
        company = { id: Number(result.lastInsertRowid) }
      }

      const verifiedAt = isoNow()
      database
        .prepare(
          `UPDATE users
           SET email_verified_at = ?, company_id = ?, pending_company_name = NULL
           WHERE id = ? AND company_id IS NULL`,
        )
        .run(verifiedAt, company.id, user.id)
      database
        .prepare(
          `UPDATE email_verification_tokens
           SET used_at = ?
           WHERE user_id = ? AND used_at IS NULL`,
        )
        .run(verifiedAt, user.id)
      const sessionId = createSession(user.id)
      return { sessionId, user: currentUser(user.id) }
    })
    return verify.immediate()
  }

  function resendVerification(emailValue: string) {
    const user = findUserByEmail(normaliseEmail(emailValue))
    if (!user || user.email_verified_at) {
      throw new AppError(400, 'No unverified account was found')
    }
    issueVerification(user)
    return { message: verificationEmailGeneratedMessage }
  }

  function signIn(emailValue: string, password: string) {
    const email = normaliseEmail(emailValue)
    const cutoff = now().getTime() - failureWindowMs
    const recentFailures = (failures.get(email) ?? []).filter(
      (attempt) => attempt > cutoff,
    )
    failures.set(email, recentFailures)
    if (recentFailures.length >= maximumFailures) {
      throw new AppError(429, 'Too many sign-in attempts. Try again later.')
    }

    const user = findUserByEmail(email)
    if (
      !user ||
      !user.email_verified_at ||
      !user.company_id ||
      !passwordMatches(password, user.password_hash)
    ) {
      recentFailures.push(now().getTime())
      throw new AppError(401, 'Email or password is incorrect')
    }

    failures.delete(email)
    const sessionId = createSession(user.id)
    return { sessionId, user: currentUser(user.id) }
  }

  function signOut(sessionId: string) {
    database.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    return { success: true as const }
  }

  function requestPasswordReset(emailValue: string) {
    const user = findUserByEmail(normaliseEmail(emailValue))
    if (user) {
      const issuedToken = newToken()
      const issuedAt = isoNow()
      database
        .prepare(
          `UPDATE password_reset_tokens
           SET used_at = ?
           WHERE user_id = ? AND used_at IS NULL`,
        )
        .run(issuedAt, user.id)
      database
        .prepare(
          `INSERT INTO password_reset_tokens
            (user_id, token_hash, expires_at, used_at)
           VALUES (?, ?, ?, NULL)`,
        )
        .run(user.id, tokenHash(issuedToken), expiry(resetLifetimeMs))
      sendPasswordResetEmail(
        user.email,
        `${options.clientOrigin}/reset-password?token=${encodeURIComponent(issuedToken)}`,
      )
    }
    return { message: passwordResetRequestedMessage }
  }

  function resetPassword(token: string, password: string) {
    const reset = database.transaction(() => {
      const tokenRow = database
        .prepare(
          `SELECT id, user_id AS userId
           FROM password_reset_tokens
           WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
        )
        .get(tokenHash(token), isoNow()) as
        { id: number; userId: number } | undefined
      if (!tokenRow) {
        throw new AppError(400, 'Password reset link is invalid or expired')
      }
      database
        .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(hashPassword(password), tokenRow.userId)
      database
        .prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
        .run(isoNow(), tokenRow.id)
      database
        .prepare('DELETE FROM sessions WHERE user_id = ?')
        .run(tokenRow.userId)
      return { success: true as const }
    })
    return reset.immediate()
  }

  function changePassword(
    userId: number,
    sessionId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = database
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as UserRow | undefined
    if (!user || !passwordMatches(currentPassword, user.password_hash)) {
      throw new AppError(400, 'Current password is incorrect', {
        currentPassword: ['Current password is incorrect'],
      })
    }
    const change = database.transaction(() => {
      database
        .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(hashPassword(newPassword), userId)
      database
        .prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?')
        .run(userId, sessionId)
    })
    change()
    return { success: true as const }
  }

  function updateProfile(userId: number, name: string) {
    const result = database
      .prepare('UPDATE users SET name = ? WHERE id = ?')
      .run(name.trim(), userId)
    if (!result.changes) throw new AppError(401, 'Authentication required')
    return { user: currentUser(userId) }
  }

  function invite(userId: number, emailValue: string) {
    const inviter = currentUser(userId)
    const email = normaliseEmail(emailValue)
    if (domainFor(email) !== inviter.company.emailDomain) {
      throw new AppError(422, 'Invitee must use your company email domain', {
        email: [`Use an address at ${inviter.company.emailDomain}`],
      })
    }
    sendInvitationEmail(
      email,
      `${options.clientOrigin}/register?email=${encodeURIComponent(email)}`,
    )
    return { message: invitationGeneratedMessage }
  }

  return {
    lookupDomain,
    register,
    verifyEmail,
    resendVerification,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
    changePassword,
    currentUser,
    updateProfile,
    invite,
  }
}

export type AccountService = ReturnType<typeof createAccountService>
