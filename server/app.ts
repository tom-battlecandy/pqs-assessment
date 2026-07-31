import express from 'express'

import { config } from './config.js'
import { openDatabase } from './db/connection.js'
import { createAccountRouter } from './modules/account/routes.js'
import { createTrainingRouter } from './modules/training/routes.js'
import { type AuthenticatedRequest, requireSession } from './shared/auth.js'
import { errorHandler } from './shared/errors.js'

export const app = express()
const database = openDatabase(config.databasePath)

app.disable('x-powered-by')
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api/account', createAccountRouter(database, config.clientOrigin))
app.use(
  '/api/training',
  requireSession(database),
  createTrainingRouter({
    database,
    resolveUserId: (request) => (request as AuthenticatedRequest).auth?.userId,
    today: () => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts()
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((candidate) => candidate.type === type)?.value
      return `${part('year')}-${part('month')}-${part('day')}`
    },
  }),
)
app.use(errorHandler)
