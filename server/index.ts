import { app } from './app.js'
import { config } from './config.js'

const server = app.listen(config.port, () => {
  console.log(`PQS API listening on http://localhost:${config.port}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
