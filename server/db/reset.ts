import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import {
  defaultDatabasePath,
  openDatabase,
  resolveDatabasePath,
} from './connection.js'

const databasePath = resolveDatabasePath()

if (databasePath !== defaultDatabasePath) {
  throw new Error(
    `Refusing to reset ${databasePath}. db:reset may only replace ${defaultDatabasePath}.`,
  )
}

mkdirSync(path.dirname(defaultDatabasePath), { recursive: true })
rmSync(defaultDatabasePath, { force: true })

const database = openDatabase(defaultDatabasePath)
database.close()

console.log(`Reset database at ${defaultDatabasePath}`)
