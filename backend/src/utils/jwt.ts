import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export function signToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): { userId: string; role: string; iat?: number; exp?: number } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string; role: string; iat?: number; exp?: number }
}

export function signResetToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'password_reset' }, env.JWT_SECRET, { expiresIn: '15m' })
}

export function verifyResetToken(token: string): { userId: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose: string }
  if (payload.purpose !== 'password_reset') throw new Error('Invalid token')
  return { userId: payload.userId }
}
