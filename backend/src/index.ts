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

/* ── Env validation ─────────────────────────────────────────────────────── */
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET']
const missing  = REQUIRED.filter(k => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}
if (
  process.env.JWT_SECRET === 'dev-secret' ||
  process.env.JWT_SECRET?.includes('change-this')
) {
  console.warn('[startup] ⚠️  WARNING: Insecure JWT_SECRET detected — change before production!')
}

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(express.json())

const healthPayload = (_req: express.Request, res: express.Response) =>
  res.json({ status: 'ok', version: '0.1.0', ts: new Date().toISOString() })

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
