import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/* Minimal seed.
   The ONLY non-imported accounts allowed in the system are the Developer and
   the Admin — every other user comes from the employee master-file import.
   Demo password is P@ssw0rd! (development only; refuses to run in production
   unless ALLOW_PROD_SEED=true). */
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('[seed] Refusing to seed in production. Set ALLOW_PROD_SEED=true to override (NOT recommended).')
    process.exit(1)
  }

  const hash = await bcrypt.hash('P@ssw0rd!', 10)

  const developer = await prisma.user.upsert({
    where: { email: 'developer@amw-ems.com' },
    update: { role: Role.DEVELOPER },
    create: {
      email: 'developer@amw-ems.com',
      name: 'Developer',
      password: hash,
      role: Role.DEVELOPER,
      department: 'Platform',
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@amw-ems.com' },
    update: { role: Role.ADMIN },
    create: {
      email: 'admin@amw-ems.com',
      name: 'Administrator',
      password: hash,
      role: Role.ADMIN,
      department: 'Executive',
    },
  })

  console.log('Seed complete — only Developer + Admin exist as non-imported accounts:')
  console.table([
    { Role: developer.role, Email: developer.email },
    { Role: admin.role, Email: admin.email },
  ])
  console.log('Password: P@ssw0rd!  ·  every other user comes from the employee import.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
