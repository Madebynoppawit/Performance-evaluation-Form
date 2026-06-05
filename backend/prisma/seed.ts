import { PrismaClient, Role, Position, EvaluationType, CycleStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
  const cycle = await prisma.cycle.create({
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
    await prisma.evaluation.upsert({
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
