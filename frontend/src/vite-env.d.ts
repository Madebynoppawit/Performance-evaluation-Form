/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API requests. Empty/omitted → uses the Vite dev proxy ("/api"). */
  readonly VITE_API_BASE_URL?: string
  /** Display name shown in the shell/splash. */
  readonly VITE_APP_NAME?: string
  /** App version surfaced in the UI. */
  readonly VITE_APP_VERSION?: string
  /** Sentry DSN. When set, error monitoring activates; otherwise dormant. */
  readonly VITE_SENTRY_DSN?: string
  /** Deployment environment label shown in the governance bar (PROD | UAT | DEV). */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
