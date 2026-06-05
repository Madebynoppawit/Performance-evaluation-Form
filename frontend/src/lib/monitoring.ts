/* Error monitoring — dormant unless VITE_SENTRY_DSN is set.
   The Sentry SDK is dynamically imported so it never ships in the initial
   bundle (and never loads at all) when no DSN is configured. */

let capture: ((error: unknown) => void) | null = null

export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      tracesSampleRate: 0.1,
    })
    capture = (error) => Sentry.captureException(error)
  } catch (e) {
    console.warn('[monitoring] Sentry failed to initialize', e)
  }
}

/** Report an error to Sentry when active; no-op otherwise. */
export function reportError(error: unknown): void {
  capture?.(error)
}
