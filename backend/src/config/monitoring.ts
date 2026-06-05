import { env } from './env'

/* Error monitoring — dormant unless SENTRY_DSN is set.
   The Sentry SDK is dynamically imported so it isn't loaded at all
   when no DSN is configured (dev, test, CI). */

let capture: ((error: unknown) => void) | null = null

export async function initMonitoring(): Promise<void> {
  if (!env.SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/node')
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1,
    })
    capture = (error) => Sentry.captureException(error)
    console.log('[monitoring] Sentry initialized')
  } catch (e) {
    console.warn('[monitoring] Sentry failed to initialize', e)
  }
}

/** Report an error to Sentry when active; no-op otherwise. */
export function reportError(error: unknown): void {
  capture?.(error)
}
