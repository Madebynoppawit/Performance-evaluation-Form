import { prisma } from '../lib/prisma'
import { comparePassword, hashPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'

function dateKey(value: Date | string | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)

  const text = value.trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const year = Number(iso[1]) > 2400 ? Number(iso[1]) - 543 : Number(iso[1])
    return `${year}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slash) {
    const year = Number(slash[3]) > 2400 ? Number(slash[3]) - 543 : Number(slash[3])
    return `${year}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function sourceValue(sourceData: unknown, ...keys: string[]) {
  if (!sourceData || typeof sourceData !== 'object' || Array.isArray(sourceData)) return null
  const row = sourceData as Record<string, unknown>
  const hit = Object.keys(row).find((key) => keys.some((wanted) => key.toLowerCase().trim() === wanted.toLowerCase()))
  const value = hit ? row[hit] : null
  return typeof value === 'string' ? value : null
}

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
  if (data.jobTitle !== undefined) payload.jobTitle = data.jobTitle
  // Changing the password also clears the forced-change flag.
  if (data.password) {
    payload.password = await hashPassword(data.password)
    payload.mustChangePassword = false
  }

  const user = await prisma.user.update({ where: { id: userId }, data: payload })
  const { password: _pw, ...safeUser } = user
  return safeUser
}

export async function resetPasswordWithIdentity(data: {
  employeeNo: string
  dateOfBirth: string
  password: string
}) {
  const employeeNo = data.employeeNo.trim().replace(/[,\s]/g, '')
  const user = await prisma.user.findUnique({ where: { employeeNo } })
  const submittedDob = dateKey(data.dateOfBirth)
  const storedDob =
    dateKey(user?.dateOfBirth) ??
    dateKey(sourceValue(user?.sourceData, 'Date of Birth', 'DOB', 'Birth Date', 'Birthday'))

  if (!user || !storedDob || storedDob !== submittedDob) {
    const err = new Error('Could not verify employee number and date of birth') as Error & { status: number }
    err.status = 400
    throw err
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(data.password),
      mustChangePassword: false,
    },
  })

  return { userId: user.id, role: user.role }
}
