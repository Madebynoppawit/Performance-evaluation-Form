import { prisma } from '../lib/prisma'
import { Role, Position } from '@prisma/client'
import { hashPassword } from '../utils/hash'
import { generateTempPassword } from '../utils/tempPassword'

/** Minimal user directory — id, name, role, position, department only.
 *  Accessible by any authenticated role (used for evaluation create dropdowns). */
export async function getDirectory() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, role: true, position: true, department: true },
    orderBy: { name: 'asc' },
  })
}

export async function getAllUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
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
  return prisma.user.findFirstOrThrow({
    where: { id, deletedAt: null },
    select: {
      id: true, email: true, name: true, role: true,
      position: true, department: true, managerId: true,
      jobTitle: true, jobGrade: true, division: true, buGroup: true,
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
  const exists = await prisma.user.findFirst({ where: { email: data.email, deletedAt: null } })
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
    jobGrade?: string | null
    division?: string | null
    buGroup?: string | null
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

/** Admin action: reset a user to a fresh, unique temporary password and force a
    change on their next login. Returns the plaintext once so the admin can hand
    it to the user. No shared default — knowing one temp password reveals nothing
    about other accounts. */
export async function resetPassword(id: string) {
  const tempPassword = generateTempPassword()
  await prisma.user.update({
    where: { id },
    // passwordChangedAt invalidates the target's existing sessions on reset.
    data: { password: await hashPassword(tempPassword), mustChangePassword: true, passwordChangedAt: new Date() },
  })
  return { defaultPassword: tempPassword }
}

export async function deleteUser(id: string) {
  // Guard against locking everyone out: never delete the final privileged
  // (ADMIN/DEVELOPER) account.
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { role: true } })
  if (target && (target.role === 'ADMIN' || target.role === 'DEVELOPER')) {
    const privileged = await prisma.user.count({ where: { role: { in: ['ADMIN', 'DEVELOPER'] }, deletedAt: null } })
    if (privileged <= 1) throw new LastAdminError()
  }

  // Archive HR-linked records instead of destroying appraisal history.
  return prisma.$transaction(async tx => {
    await tx.user.updateMany({ where: { managerId: id }, data: { managerId: null } })
    await tx.evaluation.updateMany({
      where: { OR: [{ evaluateeId: id }, { evaluatorId: id }, { reviewerId: id }], deletedAt: null },
      data: { deletedAt: new Date() },
    })
    return tx.user.update({ where: { id }, data: { deletedAt: new Date(), managerId: null } })
  })
}
