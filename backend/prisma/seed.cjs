const { PrismaClient, Role } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('[seed] Refusing to seed in production. Set ALLOW_PROD_SEED=true to override for demo/staging only.')
    process.exit(1)
  }

  const hash = await bcrypt.hash('AmwDemo2026!', 10)

  const developer = await prisma.user.upsert({
    where: { email: 'developer@amw-ems.com' },
    update: {
      name: 'Developer',
      password: hash,
      role: Role.DEVELOPER,
      department: 'Platform',
      employeeNo: 'DEV-001',
      dateOfBirth: new Date('1990-01-01'),
      mustChangePassword: false,
    },
    create: {
      email: 'developer@amw-ems.com',
      name: 'Developer',
      password: hash,
      role: Role.DEVELOPER,
      department: 'Platform',
      employeeNo: 'DEV-001',
      dateOfBirth: new Date('1990-01-01'),
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@amw-ems.com' },
    update: {
      name: 'Administrator',
      password: hash,
      role: Role.ADMIN,
      department: 'Executive',
      position: 'MANAGING_DIRECTOR',
      employeeNo: 'ADM-001',
      dateOfBirth: new Date('1990-01-01'),
      mustChangePassword: false,
    },
    create: {
      email: 'admin@amw-ems.com',
      name: 'Administrator',
      password: hash,
      role: Role.ADMIN,
      department: 'Executive',
      position: 'MANAGING_DIRECTOR',
      employeeNo: 'ADM-001',
      dateOfBirth: new Date('1990-01-01'),
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager.eng@amw-ems.com' },
    update: {
      name: 'Engineering Manager',
      password: hash,
      role: Role.MANAGER,
      position: 'MANAGER',
      department: 'Engineering',
      employeeNo: 'MGR-001',
      dateOfBirth: new Date('1990-01-01'),
      mustChangePassword: false,
    },
    create: {
      email: 'manager.eng@amw-ems.com',
      name: 'Engineering Manager',
      password: hash,
      role: Role.MANAGER,
      position: 'MANAGER',
      department: 'Engineering',
      employeeNo: 'MGR-001',
      dateOfBirth: new Date('1990-01-01'),
    },
  })

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor1@amw-ems.com' },
    update: {
      name: 'Production Supervisor',
      password: hash,
      role: Role.MANAGER,
      position: 'SUPERVISOR',
      department: 'Production',
      employeeNo: 'SUP-001',
      dateOfBirth: new Date('1990-01-01'),
      managerId: manager.id,
      mustChangePassword: false,
    },
    create: {
      email: 'supervisor1@amw-ems.com',
      name: 'Production Supervisor',
      password: hash,
      role: Role.MANAGER,
      position: 'SUPERVISOR',
      department: 'Production',
      employeeNo: 'SUP-001',
      dateOfBirth: new Date('1990-01-01'),
      managerId: manager.id,
    },
  })

  const officer = await prisma.user.upsert({
    where: { email: 'officer1@amw-ems.com' },
    update: {
      name: 'Operations Officer',
      password: hash,
      role: Role.EMPLOYEE,
      position: 'OFFICER',
      department: 'Operations',
      employeeNo: 'OFF-001',
      dateOfBirth: new Date('1990-01-01'),
      managerId: manager.id,
      mustChangePassword: false,
    },
    create: {
      email: 'officer1@amw-ems.com',
      name: 'Operations Officer',
      password: hash,
      role: Role.EMPLOYEE,
      position: 'OFFICER',
      department: 'Operations',
      employeeNo: 'OFF-001',
      dateOfBirth: new Date('1990-01-01'),
      managerId: manager.id,
    },
  })

  let template = await prisma.template.findFirst({
    where: { name: 'AMW Demo Performance Review' },
  })
  if (!template) {
    template = await prisma.template.create({
      data: {
        name: 'AMW Demo Performance Review',
        description: 'Demo-ready annual performance review template.',
        type: 'MANAGER',
        sections: {
          create: [
            {
              title: 'Performance Goals',
              description: 'Core annual goals for demo evaluation workflows.',
              weight: 1,
              order: 1,
              questions: {
                create: [
                  {
                    text: 'Overall goal delivery',
                    type: 'rating',
                    weight: 1,
                    required: true,
                    order: 1,
                    options: ['1', '2', '3', '4', '5'],
                  },
                ],
              },
            },
          ],
        },
      },
    })
  }

  let cycle = await prisma.cycle.findFirst({
    where: { name: 'FY2026 Demo Review' },
  })
  if (!cycle) {
    cycle = await prisma.cycle.create({
      data: {
        name: 'FY2026 Demo Review',
        description: 'Seeded demo cycle for deploy verification.',
        templateId: template.id,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    })
  }

  const evaluation = await prisma.evaluation.upsert({
    where: {
      cycleId_evaluateeId_evaluatorId_type: {
        cycleId: cycle.id,
        evaluateeId: officer.id,
        evaluatorId: manager.id,
        type: 'MANAGER',
      },
    },
    update: {
      status: 'IN_PROGRESS',
      formType: 'OFFICER_LEVEL',
      evaluateeName: officer.name,
      evaluatorName: manager.name,
      evaluationReason: 'ANNUAL',
      evaluatorTitle: 'Engineering Manager',
      performanceGrade: 'ABOVE_STANDARD',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      totalScore: 4.11,
      goalScore: null,
      competencyScore: 4.11,
      attendanceScore: null,
      submittedAt: null,
    },
    create: {
      cycleId: cycle.id,
      evaluateeId: officer.id,
      evaluatorId: manager.id,
      type: 'MANAGER',
      status: 'IN_PROGRESS',
      formType: 'OFFICER_LEVEL',
      evaluateeName: officer.name,
      evaluatorName: manager.name,
      evaluatorTitle: 'Engineering Manager',
      evaluationReason: 'ANNUAL',
      performanceGrade: 'ABOVE_STANDARD',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      totalScore: 4.11,
      goalScore: null,
      competencyScore: 4.11,
      attendanceScore: null,
      submittedAt: null,
    },
  })

  await prisma.goalEntry.deleteMany({ where: { evaluationId: evaluation.id } })
  await prisma.goalEntry.createMany({
    data: [
      {
        evaluationId: evaluation.id,
        order: 1,
        goal: 'Stabilize monthly operations reporting and close all required reports within SLA.',
        goalDescription: 'Demo KPI for export verification.',
        wig: 'Operational Excellence',
        kpiCategory: 'Delivery',
        weight: 50,
        targetRating5: '100% on time with no rework',
        targetRating4: '95% on time with minor rework',
        targetRating3: '90% on time',
        targetRating2: '80% on time',
        targetRating1: '<80% on time',
        result: '96% reports closed on time; one minor correction cycle.',
        evaluationScore: 4,
        employeeComment: 'Improved checklist and weekly follow-up cadence.',
        superiorComment: 'Consistent delivery and good ownership.',
      },
      {
        evaluationId: evaluation.id,
        order: 2,
        goal: 'Improve cross-department request turnaround time.',
        goalDescription: 'Demo KPI for export verification.',
        wig: 'Customer Focus',
        kpiCategory: 'Process',
        weight: 50,
        targetRating5: '<1 business day average turnaround',
        targetRating4: '<2 business days average turnaround',
        targetRating3: '<3 business days average turnaround',
        targetRating2: '<4 business days average turnaround',
        targetRating1: '>=4 business days average turnaround',
        result: 'Average turnaround improved to 1.8 business days.',
        evaluationScore: 4,
        employeeComment: 'Standardized request tracking with departments.',
        superiorComment: 'Visible improvement in response discipline.',
      },
    ],
  })

  const demoScores = [
    ['1.1', 4], ['1.2', 4], ['1.3', 4],
    ['2.1', 5], ['2.2', 4], ['2.3', 4],
    ['3.1', 4], ['3.2', 4], ['3.3', 4],
    ['4.1', 4], ['4.2', 4], ['4.3', 5],
    ['5.1', 4], ['5.2', 4], ['5.3', 4],
    ['6.1', 4], ['6.2', 4], ['6.3', 4],
  ]
  for (const [competencyId, score] of demoScores) {
    await prisma.competencyScore.upsert({
      where: { evaluationId_competencyId: { evaluationId: evaluation.id, competencyId } },
      update: { score },
      create: { evaluationId: evaluation.id, competencyId, score },
    })
  }

  await prisma.attendanceScore.upsert({
    where: { evaluationId: evaluation.id },
    update: {
      leaveActualDays: 2,
      lateActualTimes: 1,
      disciplinaryLevel: 'NONE',
      leaveScore: 4,
      lateScore: 4,
      disciplinaryScore: 5,
      attendanceAvgScore: 4.33,
    },
    create: {
      evaluationId: evaluation.id,
      leaveActualDays: 2,
      lateActualTimes: 1,
      disciplinaryLevel: 'NONE',
      leaveScore: 4,
      lateScore: 4,
      disciplinaryScore: 5,
      attendanceAvgScore: 4.33,
    },
  })

  await prisma.trainingScore.upsert({
    where: { evaluationId: evaluation.id },
    update: {
      minimumHours: 12,
      actualHours: 16,
      percentOfMinimum: 133.33,
      score: 5,
      behaviorNote: 'Completed compliance refresh, Excel reporting, and process improvement training.',
    },
    create: {
      evaluationId: evaluation.id,
      minimumHours: 12,
      actualHours: 16,
      percentOfMinimum: 133.33,
      score: 5,
      behaviorNote: 'Completed compliance refresh, Excel reporting, and process improvement training.',
    },
  })

  await prisma.evaluationComment.upsert({
    where: { evaluationId: evaluation.id },
    update: {
      strengths: 'Reliable operations follow-up, accurate documentation, and strong coordination with stakeholders.',
      improvements: 'Continue improving prioritization during peak request periods and make risks visible earlier.',
      requiredSkills: 'Advanced reporting, root-cause analysis, and stakeholder communication.',
    },
    create: {
      evaluationId: evaluation.id,
      strengths: 'Reliable operations follow-up, accurate documentation, and strong coordination with stakeholders.',
      improvements: 'Continue improving prioritization during peak request periods and make risks visible earlier.',
      requiredSkills: 'Advanced reporting, root-cause analysis, and stakeholder communication.',
    },
  })

  await prisma.salarySummary.upsert({
    where: { evaluationId: evaluation.id },
    update: {
      oldSalary: 32000,
      newSalary: 34500,
      bonus: 18000,
      bonusDeduction: 0,
      bonusPolicy: 'Demo-only compensation data for management export verification.',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
    },
    create: {
      evaluationId: evaluation.id,
      oldSalary: 32000,
      newSalary: 34500,
      bonus: 18000,
      bonusDeduction: 0,
      bonusPolicy: 'Demo-only compensation data for management export verification.',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
    },
  })

  await prisma.evaluationAcknowledgement.upsert({
    where: { evaluationId: evaluation.id },
    update: {
      employeeSignedAt: null,
      evaluatorSignedAt: null,
      directorSignedAt: null,
    },
    create: {
      evaluationId: evaluation.id,
      employeeSignedAt: null,
      evaluatorSignedAt: null,
      directorSignedAt: null,
    },
  })

  console.log('Seed complete - demo accounts and workflow data are ready:')
  console.table([
    { Role: developer.role, Email: developer.email },
    { Role: admin.role, Email: admin.email },
    { Role: manager.role, Email: manager.email },
    { Role: supervisor.role, Email: supervisor.email },
    { Role: officer.role, Email: officer.email },
  ])
  console.log('Password: AmwDemo2026! - demo/staging only.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
