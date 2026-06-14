/* env must load first — it calls dotenv before any module reads process.env. */
import { env } from './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFound'
import { apiLimiter, authLimiter } from './middleware/rateLimiter'
import { requestContext } from './middleware/requestContext'
import { auditLog } from './middleware/auditLog'
import { noStoreApiResponses } from './middleware/apiSecurity'
import { metricsMiddleware, registry } from './lib/metrics'
import authRoutes from './routes/auth'
import evaluationRoutes from './routes/evaluations'
import templateRoutes from './routes/templates'
import cycleRoutes from './routes/cycles'
import reportRoutes from './routes/reports'
import dashboardRoutes from './routes/dashboard'
import userRoutes from './routes/users'
import swaggerRoutes from './docs/swagger'
import { prisma } from './lib/prisma'
import { APP_VERSION } from './config/version'


/** The configured Express app — no server is started here, so it can be
    imported directly by integration tests (supertest). */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', env.isProd ? 1 : false)
  app.use(requestContext)
  app.use(pinoHttp({
    logger,
    // Skip health/metrics noise from logs
    autoLogging: {
      ignore: (req) => ['/health', '/api/health', '/ready', '/api/ready', '/metrics'].includes(req.url ?? ''),
    },
    customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, requestId: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }))
  app.use(metricsMiddleware)
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
      },
    },
  }))
  app.use(cors({ origin: env.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  const livenessPayload = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      version: APP_VERSION,
      env: env.NODE_ENV,
      release: {
        channel: env.APP_RELEASE_CHANNEL,
        aiEnabled: env.aiFeaturesEnabled,
        aiProvider: env.AI_PROVIDER,
      },
      checkedAt: new Date().toISOString(),
      requestId: req.requestId,
    })
  }

  const healthPayload = async (req: express.Request, res: express.Response) => {
    const checkedAt = new Date().toISOString()
    let database: 'ok' | 'degraded' = 'ok'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      database = 'degraded'
    }

    const status = database === 'ok' ? 'ok' : 'degraded'
    const payload = {
      status,
      version: APP_VERSION,
      env: env.NODE_ENV,
      release: {
        channel: env.APP_RELEASE_CHANNEL,
        aiEnabled: env.aiFeaturesEnabled,
        aiProvider: env.AI_PROVIDER,
      },
      checkedAt,
      requestId: req.requestId,
      services: {
        api: 'ok' as const,
        auth: 'ok' as const,
        database,
      },
      latencyMs: req.startedAt ? Date.now() - req.startedAt : 0,
    }
    res.status(status === 'ok' ? 200 : 503).json(payload)
  }

  app.get('/health', livenessPayload)
  app.get('/api/health', healthPayload)
  app.get('/ready', healthPayload)
  app.get('/api/ready', healthPayload)

  // Prometheus metrics. Optionally guarded by METRICS_TOKEN; otherwise restrict
  // at the network/ingress level.
  app.get('/metrics', async (req, res) => {
    if (env.METRICS_TOKEN) {
      const header = req.get('authorization')
      const token = header?.startsWith('Bearer ') ? header.slice(7) : req.query.token
      if (token !== env.METRICS_TOKEN) {
        res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
        return
      }
    }
    res.set('Content-Type', registry.contentType)
    res.end(await registry.metrics())
  })

  app.use('/api', swaggerRoutes)
  app.use('/api', noStoreApiResponses, apiLimiter, auditLog)
  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/evaluations', evaluationRoutes)
  app.use('/api/templates', templateRoutes)
  app.use('/api/cycles', cycleRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/users', userRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
