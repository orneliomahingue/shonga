import 'dotenv/config'
import argon2 from 'argon2'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { createMySqlAdapter } from '../src/database/mysql-adapter.js'
import { mozambiqueLocations } from './mozambique-locations.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurada')
const prisma = new PrismaClient({ adapter: createMySqlAdapter(databaseUrl) })

const permissions = ['users.manage', 'salons.manage', 'roles.manage', 'platform.read']
const initialCategories = ['Cabelo', 'Próteses', 'Maquilhagem', 'Unhas', 'Barbearia', 'Spa']
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
if (!adminEmail || !adminPassword) throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD devem estar configurados')

async function seed() {
  for (const [sortOrder, location] of mozambiqueLocations.entries()) {
    const province = await prisma.province.upsert({
      where: { name: location.province },
      update: { sortOrder },
      create: { name: location.province, sortOrder },
    })
    await Promise.all(location.districts.map((name) => prisma.district.upsert({
      where: { provinceId_name: { provinceId: province.id, name } },
      update: {},
      create: { provinceId: province.id, name },
    })))
  }
  await Promise.all(
    initialCategories.map((name) =>
      prisma.serviceCategory.upsert({
        where: { name },
        update: {},
        create: { name, slug: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() },
      }),
    ),
  )
  const permissionRows = await Promise.all(
    permissions.map((code) =>
      prisma.permission.upsert({ where: { code }, update: {}, create: { code } }),
    ),
  )
  const role = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrador global do SHONGA' },
  })
  await Promise.all(
    ['SALON_OWNER', 'SPECIALIST', 'CUSTOMER'].map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  )
  await Promise.all(
    permissionRows.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      }),
    ),
  )
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      firstName: 'Administrador',
      lastName: 'SHONGA',
    },
  })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  })
}

seed().finally(() => prisma.$disconnect())
