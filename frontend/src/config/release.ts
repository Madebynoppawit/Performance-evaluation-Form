const truthy = (value?: string) => ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase())

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.2.0-rc.1'
export const RELEASE_CHANNEL = (import.meta.env.VITE_RELEASE_CHANNEL || 'standard').toLowerCase()
export const AI_FEATURES_ENABLED = truthy(import.meta.env.VITE_ENABLE_AI_FEATURES) || RELEASE_CHANNEL === 'ai-preview'
export const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'none'
export const RELEASE_FLAVOR_LABEL = AI_FEATURES_ENABLED ? 'AI Preview' : 'Standard'
