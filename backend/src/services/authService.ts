import { Position } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { comparePassword, hashPassword } from '../utils/hash'
import { signToken, signResetToken, verifyResetToken } from '../utils/jwt'

export async function login(identifier: string, password: string) {
  // Accept either an employee number or an email (admins/dev accounts have no
  // employee number), so neither group is locked out.
  const id = identifier.trim()
  const user = await prisma.user.findFirst({
    where: { OR: [{ employeeNo: id }, { email: id.toLowerCase() }] },
  })
  if (!user) throw new Error('Invalid credentials')

  const valid = await comparePassword(password, user.password)
  if (!valid) throw new Error('Invalid credentials')

  const token = signToken({ userId: user.id, role: user.role })
  const { password: _, ...safeUser } = user
  return { user: safeUser, token }
}

export async function register(data: {
  email: string
  password: string
  name: string
  department?: string
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) {
    const err = Object.assign(new Error('Email is already registered'), { status: 409 })
    throw err
  }

  const password = await hashPassword(data.password)
  const user = await prisma.user.create({ data: { ...data, password } })
  const token = signToken({ userId: user.id, role: user.role })
  const { password: _, ...safeUser } = user
  return { user: safeUser, token }
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, department: true, managerId: true, position: true, jobTitle: true, employeeNo: true, mustChangePassword: true, dateOfBirth: true },
  })
  return user
}

/** Self-service profile update. Excludes `role` — privilege changes stay with
    admins via the user-management endpoint. */
export async function updateProfile(
  userId: string,
  data: {
    name?: string
    email?: string
    department?: string | null
    position?: Position | null
    jobTitle?: string | null
    password?: string
    dateOfBirth?: Date | null
  }
) {
  if (data.email) {
    const taken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
      select: { id: true },
    })
    if (taken) {
      const err = new Error('Email is already in use') as Error & { status: number }
      err.status = 409
      throw err
    }
  }

  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.email !== undefined) payload.email = data.email
  if (data.department !== undefined) payload.department = data.department
  if (data.position !== undefined) payload.position = data.position
  if (data.jobTitle !== undefined) payload.jobTitle = data.jobTitle
  if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth
  // Changing the password also clears the forced-change flag.
  if (data.password) {
    payload.password = await hashPassword(data.password)
    payload.mustChangePassword = false
  }

  const user = await prisma.user.update({ where: { id: userId }, data: payload })
  const { password: _pw, ...safeUser } = user
  return safeUser
}

/** Verify employee number + date of birth; if match → return a short-lived
    reset token (15 min). Uses a generic error to avoid user enumeration. */
export async function forgotPassword(employeeNo: string, dateOfBirth: Date): Promise<string> {
  const genericErr = new Error('No matching account found')

  const user = await prisma.user.findFirst({
    where: { employeeNo: employeeNo.trim() },
    select: { id: true, dateOfBirth: true },
  })
  if (!user || !user.dateOfBirth) throw genericErr

  // Compare calendar date only (ignore stored time component).
  const stored = user.dateOfBirth
  const match =
    stored.getUTCFullYear() === dateOfBirth.getUTCFullYear() &&
    stored.getUTCMonth()    === dateOfBirth.getUTCMonth()    &&
    stored.getUTCDate()     === dateOfBirth.getUTCDate()
  if (!match) throw genericErr

  return signResetToken(user.id)
}

/** Consume a reset token and set a new password. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const { userId } = verifyResetToken(token)
  const hash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, mustChangePassword: false },
  })
}
