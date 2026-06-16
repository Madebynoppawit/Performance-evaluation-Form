import { prisma } from '../lib/prisma'
import { Role, Position } from '@prisma/client'
import { hashPassword } from '../utils/hash'
import { env } from '../config/env'

/** Minimal user directory — id, name, role, position, department only.
 *  Accessible by any authenticated role (used for evaluation create dropdowns). */
export async function getDirectory() {
  return prisma.user.findMany({
    select: { id: true, name: true, role: true, position: true, department: true, employeeNo: true },
    orderBy: { name: 'asc' },
  })
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      position: true, department: true, jobTitle: true, managerId: true,
      employeeNo: true, mustChangePassword: true, sourceData: true,
      hireDate: true, dateOfBirth: true,
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
  employeeNo?: string | null
  dateOfBirth?: string | null
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
    jobTitle?: string | null
    employeeNo?: string | null
    dateOfBirth?: Date | null
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

export class LastAdminError extends Error {
  constructor() { super('LAST_ADMIN') }
}

/** Admin action: reset a user back to the shared default password and force a
    change on their next login. Returns the default password for display. */
export async function resetPassword(id: string) {
  await prisma.user.update({
    where: { id },
    data: { password: await hashPassword(env.EMPLOYEE_DEFAULT_PASSWORD), mustChangePassword: true },
  })
  return { defaultPassword: env.EMPLOYEE_DEFAULT_PASSWORD }
}

export async function deleteUser(id: string) {
  // Guard against locking everyone out: never delete the final privileged
  // (ADMIN/DEVELOPER) account.
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (target && (target.role === 'ADMIN' || target.role === 'DEVELOPER')) {
    const privileged = await prisma.user.count({ where: { role: { in: ['ADMIN', 'DEVELOPER'] } } })
    if (privileged <= 1) throw new LastAdminError()
  }

  // Evaluations reference the user as evaluatee/evaluator with a Restrict FK, so
  // they must be cleared first. Subordinates (managerId) and audit events detach
  // automatically via SetNull. Everything runs in one transaction.
  return prisma.$transaction(async tx => {
    await tx.user.updateMany({ where: { managerId: id }, data: { managerId: null } })
    await tx.evaluation.deleteMany({ where: { OR: [{ evaluateeId: id }, { evaluatorId: id }] } })
    return tx.user.delete({ where: { id } })
  })
}
