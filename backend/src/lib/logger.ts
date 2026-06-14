import pino from 'pino'
import { env } from '../config/env'

/**
 * Singleton structured logger.
 * - Production: JSON to stdout — ingest with Loki / CloudWatch / Datadog.
 * - Development: pretty-printed via pino/pretty transport.
 * - Test: silent (level=silent) so test output isn't polluted.
 */
export const logger = pino({
  level: env.LOG_LEVEL ?? 'info',
  ...(env.isProd
    ? {}
    : env.NODE_ENV === 'test'
      ? { level: 'silent' }
      : {
          transport: {
            target: 'pino/file',
            options: { destination: 1 },
          },
        }),
  base: {
    service: 'amw-backend',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})
