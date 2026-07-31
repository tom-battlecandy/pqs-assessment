import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const databaseDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(databaseDirectory, '../..')

export const defaultDatabasePath = path.join(projectRoot, 'data', 'pqs.sqlite')

export function resolveDatabasePath(
  configuredPath = process.env.DATABASE_PATH ?? defaultDatabasePath,
) {
  return path.resolve(projectRoot, configuredPath)
}

export function openDatabase(configuredPath?: string) {
  const databasePath = resolveDatabasePath(configuredPath)
  mkdirSync(path.dirname(databasePath), { recursive: true })

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')
  database.exec(
    readFileSync(path.join(databaseDirectory, 'schema.sql'), 'utf8'),
  )

  return database
}
