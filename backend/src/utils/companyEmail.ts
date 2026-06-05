import { z } from 'zod'
import { env } from '../config/env'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isCompanyEmail(email: string) {
  return normalizeEmail(email).endsWith(`@${env.COMPANY_EMAIL_DOMAIN.toLowerCase()}`)
}

export const companyEmailSchema = z
  .string()
  .email()
  .transform(normalizeEmail)
  .refine(isCompanyEmail, {
    message: `Email must use @${env.COMPANY_EMAIL_DOMAIN}`,
  })
