import { prisma } from '../lib/prisma'
import { Role, Position } from '@prisma/client'
import { hashPassword } from '../utils/hash'

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      position: true, department: true, jobTitle: true, managerId: true,
      createdAt: true, updatedAt: true,
      manager: { select: { id: true, name: true } },
      _count: {
        select: {
          evaluationsAsEvaluatee: true,
          evaluationsAsEvaluator: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true,
      position: true, department: true, managerId: true,
      createdAt: true, updatedAt: true,
      manager: { select: { id: true, name: true } },
      employees: { select: { id: true, name: true, position: true } },
    },
  })
}

export async function createUser(data: {
  email: string
  name: string
  password: string
  role: Role
  position?: Position
  department?: string
  managerId?: string
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) throw new Error('Email นี้มีอยู่ในระบบแล้ว')
  const password = await hashPassword(data.password)
  return prisma.user.create({
    data: { ...data, password },
    select: { id: true, email: true, name: true, role: true, position: true, department: true, jobTitle: true },
  })
}

export async function updateUser(
  id: string,
  data: {
    name?: string
    role?: Role
    position?: Position
    department?: string
    managerId?: string | null
    password?: string
  }
) {
  const payload: Record<string, unknown> = { ...data }
  if (data.password) {
    payload.password = await hashPassword(data.password)
  } else {
    delete payload.password
  }
  return prisma.user.update({
    where: { id },
    data: payload,
    select: { id: true, email: true, name: true, role: true, position: true, department: true, jobTitle: true },
  })
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } })
}
