import 'dotenv/config'

import { z } from 'zod'

const configSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_PATH: z.string().min(1).default('./data/pqs.sqlite'),
  APP_TIMEZONE: z
    .string()
    .min(1)
    .default('Europe/London')
    .refine(
      (timezone) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: timezone })
          return true
        } catch {
          return false
        }
      },
      { message: 'must be a valid IANA timezone' },
    ),
})

const parsedConfig = configSchema.safeParse(process.env)

if (!parsedConfig.success) {
  console.error(
    'Invalid server configuration:',
    z.prettifyError(parsedConfig.error),
  )
  process.exit(1)
}

export const config = {
  port: parsedConfig.data.API_PORT,
  clientOrigin: parsedConfig.data.CLIENT_ORIGIN,
  databasePath: parsedConfig.data.DATABASE_PATH,
  timezone: parsedConfig.data.APP_TIMEZONE,
}
