import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

function skipQaRobot(req: { get(name: string): string | undefined }) {
  return !env.isProd && /QABot\/1\.0/i.test(req.get('user-agent') ?? '')
}

function skipPasswordReset(req: { path?: string }) {
  return req.path === '/forgot-password'
}

export const apiLimiter = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  skip: skipQaRobot,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
})

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  // Only failed sign-ins count toward the limit. This still throttles brute
  // force, but stops a shared office IP (NAT) from locking out legitimate
  // users who are signing in successfully.
  skipSuccessfulRequests: true,
  skip: (req) => skipQaRobot(req) || skipPasswordReset(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again later.' },
})

export const passwordResetLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(env.RATE_LIMIT_MAX, 60),
  skip: skipQaRobot,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please wait a few minutes and try again.' },
})
