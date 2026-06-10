import { Position } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { comparePassword, hashPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'

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
  if (exists) throw new Error('Email is already registered')

  const password = await hashPassword(data.password)
  const user = await prisma.user.create({ data: { ...data, password } })
  const token = signToken({ userId: user.id, role: user.role })
  const { password: _, ...safeUser } = user
  return { user: safeUser, token }
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, department: true, managerId: true },
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
  if (data.password) payload.password = await hashPassword(data.password)

  const user = await prisma.user.update({ where: { id: userId }, data: payload })
  const { password: _pw, ...safeUser } = user
  return safeUser
}
