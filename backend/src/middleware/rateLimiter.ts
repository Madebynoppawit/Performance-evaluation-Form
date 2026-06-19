import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

function skipQaRobot(req: { get(name: string): string | undefined }) {
  return !env.isProd && /QABot\/1\.0/i.test(req.get('user-agent') ?? '')
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
  skip: skipQaRobot,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again later.' },
})
