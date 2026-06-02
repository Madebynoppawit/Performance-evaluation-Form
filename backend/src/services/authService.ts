import { PrismaClient } from '@prisma/client'
import { comparePassword, hashPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'

const prisma = new PrismaClient()

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('ไม่พบผู้ใช้')

  const valid = await comparePassword(password, user.password)
  if (!valid) throw new Error('รหัสผ่านไม่ถูกต้อง')

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
  if (exists) throw new Error('อีเมลนี้มีอยู่ในระบบแล้ว')

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
