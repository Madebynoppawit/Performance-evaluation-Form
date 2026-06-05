/* env must load first — it calls dotenv before any module reads process.env. */
import { env } from './config/env'
import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import { authLimiter } from './middleware/rateLimiter'
import authRoutes from './routes/auth'
import evaluationRoutes from './routes/evaluations'
import templateRoutes from './routes/templates'
import cycleRoutes from './routes/cycles'
import reportRoutes from './routes/reports'
import dashboardRoutes from './routes/dashboard'
import userRoutes from './routes/users'

export const APP_VERSION = '0.1.0'

/** The configured Express app — no server is started here, so it can be
    imported directly by integration tests (supertest). */
export function createApp() {
  const app = express()

  app.use(cors({ origin: env.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  const healthPayload = (_req: express.Request, res: express.Response) =>
    res.json({ status: 'ok', version: APP_VERSION, env: env.NODE_ENV, ts: new Date().toISOString() })

  app.get('/health',     healthPayload)
  app.get('/api/health', healthPayload)

  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/evaluations', evaluationRoutes)
  app.use('/api/templates', templateRoutes)
  app.use('/api/cycles', cycleRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/users', userRoutes)

  app.use(errorHandler)

  return app
}
