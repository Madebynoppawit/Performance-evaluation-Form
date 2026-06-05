/* env must load first - it calls dotenv before any module reads process.env. */
import { env } from './config/env'
import { initMonitoring } from './config/monitoring'
import { createApp, APP_VERSION } from './app'
import { prisma } from './lib/prisma'

void initMonitoring()

const app = createApp()
const SHUTDOWN_TIMEOUT_MS = 10_000

const server = app.listen(env.PORT, () => {
  console.log(`[server] AMW Command v${APP_VERSION} | ${env.NODE_ENV} | http://localhost:${env.PORT}`)
  console.log(`[server] CORS allowlist: ${env.corsOrigins.join(', ')}`)
})

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[server] ${signal} received; shutting down gracefully`)

  const forceExit = setTimeout(() => {
    console.error('[server] Graceful shutdown timed out; forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  server.close(async (err) => {
    if (err) {
      console.error('[server] Error while closing HTTP server', err)
      process.exitCode = 1
    }

    try {
      await prisma.$disconnect()
      console.log('[server] Database connections closed')
    } catch (disconnectErr) {
      console.error('[server] Error while disconnecting database', disconnectErr)
      process.exitCode = 1
    } finally {
      clearTimeout(forceExit)
      process.exit(process.exitCode ?? 0)
    }
  })
}

process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
