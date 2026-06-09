import { Request, Response, NextFunction } from 'express'
import client from 'prom-client'

/** Prometheus registry with Node/process default metrics plus HTTP metrics. */
export const registry = new client.Registry()
client.collectDefaultMetrics({ register: registry })

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
})

const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
})

/** Use the matched route pattern (low cardinality); fall back to a path with
    id-like segments collapsed so labels never explode. */
function routeLabel(req: Request): string {
  const matched = req.route?.path
  if (matched) return (req.baseUrl || '') + (typeof matched === 'string' ? matched : '')
  return (req.baseUrl || req.path || '/')
    .replace(/\/c[a-z0-9]{20,}/gi, '/:id') // cuid
    .replace(/\/[0-9a-f-]{16,}/gi, '/:id') // uuid/hex
    .replace(/\/\d+/g, '/:id') || '/'
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') return next()
  const stop = httpDuration.startTimer()
  res.on('finish', () => {
    const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) }
    stop(labels)
    httpTotal.inc(labels)
  })
  next()
}
