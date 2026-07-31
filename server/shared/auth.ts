import type { NextFunction, Request, Response } from 'express'
import type Database from 'better-sqlite3'

import { AppError } from './errors.js'

export const sessionCookieName = 'pqs_session'

export interface AuthenticatedRequest extends Request {
  auth: {
    sessionId: string
    userId: number
  }
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return undefined

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim())
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

export function requireSession(database: Database.Database) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const sessionId = readCookie(request, sessionCookieName)
    if (!sessionId) {
      next(new AppError(401, 'Authentication required'))
      return
    }

    const session = database
      .prepare(
        `SELECT user_id AS userId
         FROM sessions
         WHERE id = ? AND expires_at > ?`,
      )
      .get(sessionId, new Date().toISOString()) as
      { userId: number } | undefined

    if (!session) {
      next(new AppError(401, 'Authentication required'))
      return
    }

    ;(request as AuthenticatedRequest).auth = {
      sessionId,
      userId: session.userId,
    }
    next()
  }
}

export function setSessionCookie(response: Response, sessionId: string) {
  response.cookie(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}
