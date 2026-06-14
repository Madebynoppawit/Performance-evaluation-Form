/* env must load first - it calls dotenv before any module reads process.env. */
import { env } from './config/env'
import { initMonitoring } from './config/monitoring'
import { createApp } from './app'
import { APP_VERSION } from './config/version'
import { prisma } from './lib/prisma'
import { logger } from './lib/logger'

void initMonitoring()

const app = createApp()
const SHUTDOWN_TIMEOUT_MS = 10_000

const server = app.listen(env.PORT, () => {
  logger.info({ version: APP_VERSION, env: env.NODE_ENV, port: env.PORT, cors: env.corsOrigins }, 'AMW backend started')
})

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutdown signal received — draining connections')

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server')
      process.exitCode = 1
    }

    try {
      await prisma.$disconnect()
      logger.info('Database connections closed')
    } catch (disconnectErr) {
      logger.error({ err: disconnectErr }, 'Error while disconnecting database')
      process.exitCode = 1
    } finally {
      clearTimeout(forceExit)
      process.exit(process.exitCode ?? 0)
    }
  })
}

process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
