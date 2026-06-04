import { prisma } from '../lib/prisma'
import { CycleStatus } from '@prisma/client'

export async function getAllCycles() {
  return prisma.cycle.findMany({
    include: { template: true },
    orderBy: { startDate: 'desc' },
  })
}

export async function getCycleById(id: string) {
  return prisma.cycle.findUniqueOrThrow({
    where: { id },
    include: { template: { include: { sections: { include: { questions: true } } } } },
  })
}

export async function createCycle(data: {
  name: string
  description?: string
  templateId: string
  startDate: string
  endDate: string
}) {
  return prisma.cycle.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    include: { template: true },
  })
}

export async function updateCycleStatus(id: string, status: CycleStatus) {
  return prisma.cycle.update({ where: { id }, data: { status } })
}
