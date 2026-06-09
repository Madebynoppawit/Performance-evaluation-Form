import { PrismaClient, Role, Position, EvaluationType, CycleStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const COMPETENCY_IDS_BY_POSITION: Record<Position, string[]> = {
  [Position.DIRECTOR_UP]: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  [Position.MANAGER]: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  [Position.OFFICER]: ['CC1', 'CC2', 'CC3', 'CC4'],
  [Position.SUPERVISOR]: ['CC1', 'CC2', 'CC3', 'CC4'],
  [Position.PRODUCTION_STAFF]: ['CC1', 'CC2', 'CC3', 'CC4'],
}

function minimumTrainingHours(position: Position) {
  if (position === Position.MANAGER || position === Position.DIRECTOR_UP) return 12
  if (position === Position.PRODUCTION_STAFF) return 8
  return 10
}

function trainingPayload(position: Position, actualHours: number) {
  const minimumHours = minimumTrainingHours(position)
  const percentOfMinimum = (actualHours / minimumHours) * 100
  let score = 1
  if (percentOfMinimum >= 130) score = 5
  else if (percentOfMinimum >= 110) score = 4
  else if (percentOfMinimum >= 100) score = 3
  else if (percentOfMinimum >= 70) score = 2

  return {
    minimumHours,
    actualHours,
    percentOfMinimum,
    score,
    behaviorNote: 'Completed required learning plan and applied key practices in daily work.',
  }
}

async function main() {
  const hash = await bcrypt.hash('P@ssw0rd!', 10)

  // ─── Users ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@amw-ems.com' },
    update: {},
    create: {
      email:      'admin@amw-ems.com',
      name:       'อนุชา พงษ์ดี',
      password:   hash,
      role:       Role.ADMIN,
      position:   Position.DIRECTOR_UP,
      department: 'Executive',
    },
  })

  const director = await prisma.user.upsert({
    where: { email: 'director@amw-ems.com' },
    update: {},
    create: {
      email:      'director@amw-ems.com',
      name:       'วรรณา สุขสวัสดิ์',
      password:   hash,
      role:       Role.ADMIN,
      position:   Position.DIRECTOR_UP,
      department: 'Operations',
    },
  })

  const directorEngineering = await prisma.user.upsert({
    where: { email: 'k.keng@amw-ems.com' },
    update: {
      name:       'K.Keng',
      role:       Role.ADMIN,
      position:   Position.DIRECTOR_UP,
      department: 'Engineering',
    },
    create: {
      email:      'k.keng@amw-ems.com',
      name:       'K.Keng',
      password:   hash,
      role:       Role.ADMIN,
      position:   Position.DIRECTOR_UP,
      department: 'Engineering',
    },
  })

  const manager1 = await prisma.user.upsert({
    where: { email: 'manager.eng@amw-ems.com' },
    update: {},
    create: {
      email:      'manager.eng@amw-ems.com',
      name:       'สมชาย ใจดี',
      password:   hash,
      role:       Role.MANAGER,
      position:   Position.MANAGER,
      department: 'Engineering',
      managerId:  director.id,
    },
  })

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager.hr@amw-ems.com' },
    update: {},
    create: {
      email:      'manager.hr@amw-ems.com',
      name:       'นภัส รุ่งเรือง',
      password:   hash,
      role:       Role.MANAGER,
      position:   Position.MANAGER,
      department: 'HR',
      managerId:  director.id,
    },
  })

  const officer1 = await prisma.user.upsert({
    where: { email: 'officer1@amw-ems.com' },
    update: {},
    create: {
      email:      'officer1@amw-ems.com',
      name:       'สมหญิง รักงาน',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.OFFICER,
      department: 'Engineering',
      managerId:  manager1.id,
    },
  })

  const officer2 = await prisma.user.upsert({
    where: { email: 'officer2@amw-ems.com' },
    update: {},
    create: {
      email:      'officer2@amw-ems.com',
      name:       'ธนพล ศรีสมบัติ',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.OFFICER,
      department: 'HR',
      managerId:  manager2.id,
    },
  })

  const supervisor1 = await prisma.user.upsert({
    where: { email: 'supervisor1@amw-ems.com' },
    update: {},
    create: {
      email:      'supervisor1@amw-ems.com',
      name:       'กานต์ พัฒนากิจ',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.SUPERVISOR,
      department: 'Engineering',
      managerId:  manager1.id,
    },
  })

  const supervisor2 = await prisma.user.upsert({
    where: { email: 'supervisor2@amw-ems.com' },
    update: {},
    create: {
      email:      'supervisor2@amw-ems.com',
      name:       'พิมพ์ใจ วงค์สุวรรณ',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.SUPERVISOR,
      department: 'Production',
      managerId:  manager1.id,
    },
  })

  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@amw-ems.com' },
    update: {},
    create: {
      email:      'staff1@amw-ems.com',
      name:       'วิชัย มุ่งมั่น',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.PRODUCTION_STAFF,
      department: 'Production',
      managerId:  supervisor2.id,
    },
  })

  const staff2 = await prisma.user.upsert({
    where: { email: 'staff2@amw-ems.com' },
    update: {},
    create: {
      email:      'staff2@amw-ems.com',
      name:       'นิภา ตั้งใจดี',
      password:   hash,
      role:       Role.EMPLOYEE,
      position:   Position.PRODUCTION_STAFF,
      department: 'Production',
      managerId:  supervisor2.id,
    },
  })

  // ─── Template ─────────────────────────────────────────────────────────────
  const existing = await prisma.template.findFirst()
  const template = existing ?? await prisma.template.create({
    data: {
      name:        'แม่แบบประเมินมาตรฐาน',
      description: 'แม่แบบสำหรับประเมินผลการปฏิบัติงานประจำปี',
      type:        EvaluationType.MANAGER,
      sections: {
        create: [
          {
            title:       'ทักษะการทำงาน',
            description: 'ประเมินทักษะและความสามารถในการทำงาน',
            weight: 0.4, order: 1,
            questions: { create: [
              { text: 'ประเมินความสามารถในการทำงานตามเป้าหมาย', type: 'rating',  weight: 1.0, required: true,  order: 1 },
              { text: 'ประเมินทักษะการแก้ปัญหาและตัดสินใจ',     type: 'rating',  weight: 1.0, required: true,  order: 2 },
              { text: 'สิ่งที่ต้องการพัฒนาด้านทักษะ',           type: 'text',    weight: 0.5, required: false, order: 3 },
            ]},
          },
          {
            title:       'การทำงานเป็นทีม',
            description: 'ประเมินความสามารถในการทำงานร่วมกับผู้อื่น',
            weight: 0.3, order: 2,
            questions: { create: [
              { text: 'ความสามารถในการสื่อสารกับเพื่อนร่วมงาน', type: 'rating', weight: 1.0, required: true, order: 1 },
              { text: 'การให้ความช่วยเหลือและสนับสนุนทีม',       type: 'rating', weight: 1.0, required: true, order: 2 },
            ]},
          },
          {
            title: 'ความคิดสร้างสรรค์',
            weight: 0.3, order: 3,
            questions: { create: [
              { text: 'ระดับความคิดสร้างสรรค์ในการทำงาน', type: 'multiple_choice', weight: 1.0, required: true, order: 1,
                options: ['ต่ำมาก', 'ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก'] },
            ]},
          },
        ],
      },
    },
  })

  // ─── Cycle ────────────────────────────────────────────────────────────────
  const existingCycle = await prisma.cycle.findFirst({
    where: {
      name:        'Annual Review 2026',
      templateId:  template.id,
    },
  })
  const cycle = existingCycle ?? await prisma.cycle.create({
    data: {
      name:        'Annual Review 2026',
      description: 'รอบการประเมินผลการปฏิบัติงานประจำปี 2026',
      templateId:  template.id,
      startDate:   new Date('2026-01-01'),
      endDate:     new Date('2026-12-31'),
      status:      CycleStatus.ACTIVE,
    },
  })

  // ─── Evaluations ─────────────────────────────────────────────────────────
  const pairs: [typeof officer1 | typeof supervisor1 | typeof staff1 | typeof staff2, typeof manager1 | typeof supervisor2][] = [
    [officer1,    manager1],
    [officer2,    manager2],
    [supervisor1, manager1],
    [supervisor2, manager1],
    [staff1,      supervisor2],
    [staff2,      supervisor2],
  ]

  for (const [evaluatee, evaluator] of pairs) {
    const evaluation = await prisma.evaluation.upsert({
      where: { cycleId_evaluateeId_evaluatorId_type: {
        cycleId: cycle.id, evaluateeId: evaluatee.id,
        evaluatorId: evaluator.id, type: EvaluationType.MANAGER,
      }},
      update: {},
      create: {
        cycleId: cycle.id, evaluateeId: evaluatee.id,
        evaluatorId: evaluator.id, type: EvaluationType.MANAGER,
      },
    })

    await prisma.goalEntry.deleteMany({ where: { evaluationId: evaluation.id } })
    await prisma.goalEntry.createMany({
      data: [
        {
          evaluationId: evaluation.id,
          goal: 'Improve customer delivery reliability',
          goalDescription: 'Raise on-time completion and reduce repeat issues for assigned work.',
          weight: 20,
          targetRating5: '95',
          targetRating4: '90',
          targetRating3: '85',
          targetRating2: '80',
          targetRating1: '75',
          wig: 'WIG_1_CUSTOMER',
          kpiCategory: 'Customer',
          result: '92',
          evaluationScore: 4,
          superiorComment: 'Strong delivery discipline with measurable improvement.',
          order: 1,
        },
        {
          evaluationId: evaluation.id,
          goal: 'Build team operating discipline',
          goalDescription: 'Follow standard work, share knowledge, and support cross-functional handoffs.',
          weight: 20,
          targetRating5: '5',
          targetRating4: '4',
          targetRating3: '3',
          targetRating2: '2',
          targetRating1: '1',
          wig: 'WIG_2_PEOPLE',
          kpiCategory: 'People',
          result: '4',
          evaluationScore: 4,
          superiorComment: 'Consistent support to peers and good ownership of team routines.',
          order: 2,
        },
        {
          evaluationId: evaluation.id,
          goal: 'Deliver productivity improvement',
          goalDescription: 'Reduce rework and improve throughput in the owned process area.',
          weight: 20,
          targetRating5: '10',
          targetRating4: '8',
          targetRating3: '6',
          targetRating2: '4',
          targetRating1: '2',
          wig: 'WIG_3_RESULT',
          kpiCategory: 'Result',
          result: '8',
          evaluationScore: 4,
          superiorComment: 'Delivered meaningful productivity gain with room for automation.',
          order: 3,
        },
      ],
    })

    await prisma.competencyScore.deleteMany({ where: { evaluationId: evaluation.id } })
    await prisma.competencyScore.createMany({
      data: COMPETENCY_IDS_BY_POSITION[evaluatee.position].map((competencyId, index) => ({
        evaluationId: evaluation.id,
        competencyId,
        score: index % 4 === 0 ? 3 : 4,
      })),
    })

    await prisma.attendanceScore.upsert({
      where: { evaluationId: evaluation.id },
      create: {
        evaluationId: evaluation.id,
        leaveActualDays: 2,
        lateActualTimes: 3,
        disciplinaryLevel: 'NONE',
        leaveScore: 4,
        lateScore: 5,
        disciplinaryScore: 5,
        attendanceAvgScore: 4.67,
      },
      update: {
        leaveActualDays: 2,
        lateActualTimes: 3,
        disciplinaryLevel: 'NONE',
        leaveScore: 4,
        lateScore: 5,
        disciplinaryScore: 5,
        attendanceAvgScore: 4.67,
      },
    })

    const training = trainingPayload(evaluatee.position, minimumTrainingHours(evaluatee.position) + 2)
    await prisma.trainingScore.upsert({
      where: { evaluationId: evaluation.id },
      create: { evaluationId: evaluation.id, ...training },
      update: training,
    })

    await prisma.evaluationComment.upsert({
      where: { evaluationId: evaluation.id },
      create: {
        evaluationId: evaluation.id,
        strengths: 'Reliable execution, clear ownership, and collaborative communication.',
        improvements: 'Increase proactive risk escalation and document lessons learned earlier.',
        requiredSkills: 'Advanced process improvement, data analysis, and stakeholder communication.',
      },
      update: {
        strengths: 'Reliable execution, clear ownership, and collaborative communication.',
        improvements: 'Increase proactive risk escalation and document lessons learned earlier.',
        requiredSkills: 'Advanced process improvement, data analysis, and stakeholder communication.',
      },
    })
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const users = [
    { role: 'Admin / Director',  email: admin.email,       name: admin.name,       position: 'Director and up', dept: 'Executive'   },
    { role: 'Admin / Director',  email: director.email,    name: director.name,    position: 'Director and up', dept: 'Operations'  },
    { role: 'Director',          email: directorEngineering.email, name: directorEngineering.name, position: 'Director of Engineering', dept: 'Engineering' },
    { role: 'Manager',           email: manager1.email,    name: manager1.name,    position: 'Manager',         dept: 'Engineering' },
    { role: 'Manager',           email: manager2.email,    name: manager2.name,    position: 'Manager',         dept: 'HR'          },
    { role: 'Employee (Officer)',    email: officer1.email,    name: officer1.name,    position: 'Officer',         dept: 'Engineering' },
    { role: 'Employee (Officer)',    email: officer2.email,    name: officer2.name,    position: 'Officer',         dept: 'HR'          },
    { role: 'Employee (Supervisor)', email: supervisor1.email, name: supervisor1.name, position: 'Supervisor',      dept: 'Engineering' },
    { role: 'Employee (Supervisor)', email: supervisor2.email, name: supervisor2.name, position: 'Supervisor',      dept: 'Production'  },
    { role: 'Employee (Staff)',      email: staff1.email,      name: staff1.name,      position: 'Production Staff', dept: 'Production'  },
    { role: 'Employee (Staff)',      email: staff2.email,      name: staff2.name,      position: 'Production Staff', dept: 'Production'  },
  ]

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗')
  console.log('║                        USER ACCOUNTS — SEED COMPLETE                    ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════╣')
  console.log('║  Password (all users): P@ssw0rd!                                        ║')
  console.log('╠══════════╤═════════════════════════════╤══════════════════╤═════════════╣')
  console.log('║ Role     │ Email                       │ Name             │ Position    ║')
  console.log('╠══════════╪═════════════════════════════╪══════════════════╪═════════════╣')
  for (const u of users) {
    const r = u.role.padEnd(8)
    const e = u.email.padEnd(27)
    const n = u.name.padEnd(16)
    const p = u.position.padEnd(11)
    console.log(`║ ${r} │ ${e} │ ${n} │ ${p} ║`)
  }
  console.log('╚══════════╧═════════════════════════════╧══════════════════╧═════════════╝\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
