import { prisma } from '../lib/prisma'

export async function getAllTemplates() {
  return prisma.template.findMany({
    include: { sections: { include: { questions: true }, orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getTemplateById(id: string) {
  return prisma.template.findUniqueOrThrow({
    where: { id },
    include: { sections: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
  })
}

export async function createTemplate(data: {
  name: string
  description?: string
  type: string
}) {
  return prisma.template.create({ data: data as Parameters<typeof prisma.template.create>[0]['data'] })
}

export async function updateTemplate(id: string, data: { name?: string; description?: string }) {
  return prisma.template.update({ where: { id }, data })
}

export async function deleteTemplate(id: string) {
  return prisma.template.delete({ where: { id } })
}

export async function addSection(
  templateId: string,
  data: { title: string; description?: string; weight: number; order: number }
) {
  return prisma.section.create({ data: { templateId, ...data } })
}

export async function addQuestion(
  sectionId: string,
  data: {
    text: string
    type: string
    weight: number
    options?: string[]
    required: boolean
    order: number
  }
) {
  return prisma.question.create({
    data: { sectionId, ...data, options: data.options ?? undefined },
  })
}
