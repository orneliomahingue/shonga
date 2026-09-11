import argon2 from 'argon2'
import { GraphQLError } from 'graphql'
import { z } from 'zod'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'

const photoUrlSchema = z
  .string()
  .refine((v) => v === '' || v.startsWith('data:image/'), 'Foto inválida')
  .refine((v) => v.length <= 750_000, 'Foto demasiado grande')
  .optional()
const normalizePhoto = (photoUrl?: string) => (photoUrl === '' ? null : photoUrl)
const employeeSchema = z.object({
  salonId: z.string().uuid(),
  email: z.email().toLowerCase(),
  temporaryPassword: z.string().min(8).max(128),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20).optional(),
  jobTitle: z.string().trim().min(2).max(100),
  specialty: z.string().trim().max(120).optional(),
  photoUrl: photoUrlSchema,
  serviceIds: z.array(z.string().uuid()).default([]),
})
const employeeUpdateSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  jobTitle: z.string().trim().min(2).max(100),
  specialty: z.string().trim().max(120).optional(),
  photoUrl: photoUrlSchema,
  serviceIds: z.array(z.string().uuid()).default([]),
})
const employeeStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
const defaultWorkingHours = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 8 * 60,
  endMinute: 17 * 60,
}))

export const employeesService = {
  async featured(limit = 10) {
    return prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        salon: { status: 'APPROVED', deletedAt: null },
        services: { some: { service: { status: 'ACTIVE', deletedAt: null } } },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        salon: { select: { name: true } },
        services: {
          where: { service: { status: 'ACTIVE', deletedAt: null } },
          include: { service: { select: { id: true, name: true } } },
          take: 3,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 20),
    })
  },
  async list(salonId: string, requester: AuthUser | null) {
    await requireSalonManager(salonId, requester)
    return prisma.employee.findMany({
      where: { salonId, deletedAt: null },
      include: { user: true, services: { include: { service: true } } },
      orderBy: { user: { firstName: 'asc' } },
    })
  },
  async create(rawInput: unknown, requester: AuthUser | null) {
    const input = employeeSchema.parse(rawInput)
    await requireSalonManager(input.salonId, requester)
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing)
      throw new GraphQLError('Já existe um utilizador com este email', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    const role = await prisma.role.findUnique({ where: { name: 'SPECIALIST' } })
    if (!role) throw new GraphQLError('Perfil SPECIALIST não configurado')
    const validServices = await prisma.service.findMany({
      where: { id: { in: input.serviceIds }, salonId: input.salonId },
      select: { id: true },
    })
    if (validServices.length !== input.serviceIds.length)
      throw new GraphQLError('Um ou mais serviços não pertencem ao salão', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    const passwordHash = await argon2.hash(input.temporaryPassword)
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roles: { create: { roleId: role.id } },
        },
      })
      return tx.employee.create({
        data: {
          salonId: input.salonId,
          userId: user.id,
          jobTitle: input.jobTitle,
          specialty: input.specialty,
          photoUrl: normalizePhoto(input.photoUrl),
          services: { create: validServices.map(({ id }) => ({ serviceId: id })) },
          workingHours: { create: defaultWorkingHours },
        },
        include: { user: true, services: { include: { service: true } } },
      })
    })
  },
  async setServices(employeeId: string, serviceIds: string[], requester: AuthUser | null) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee)
      throw new GraphQLError('Especialista não encontrado', { extensions: { code: 'NOT_FOUND' } })
    await requireSalonManager(employee.salonId, requester)
    const valid = await prisma.service.count({
      where: { id: { in: serviceIds }, salonId: employee.salonId },
    })
    if (valid !== new Set(serviceIds).size)
      throw new GraphQLError('Serviços inválidos', { extensions: { code: 'BAD_USER_INPUT' } })
    await prisma.$transaction([
      prisma.employeeService.deleteMany({ where: { employeeId } }),
      prisma.employeeService.createMany({
        data: [...new Set(serviceIds)].map((serviceId) => ({ employeeId, serviceId })),
      }),
    ])
    return prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { user: true, services: { include: { service: true } } },
    })
  },
  async update(employeeId: string, rawInput: unknown, requester: AuthUser | null) {
    const input = employeeUpdateSchema.parse(rawInput)
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee)
      throw new GraphQLError('Especialista não encontrado', { extensions: { code: 'NOT_FOUND' } })
    await requireSalonManager(employee.salonId, requester)
    const validServices = await prisma.service.findMany({
      where: { id: { in: input.serviceIds }, salonId: employee.salonId },
      select: { id: true },
    })
    if (validServices.length !== new Set(input.serviceIds).size)
      throw new GraphQLError('Um ou mais serviços não pertencem ao salão', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: employee.userId },
        data: { firstName: input.firstName, lastName: input.lastName },
      })
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          jobTitle: input.jobTitle,
          specialty: input.specialty,
          photoUrl: normalizePhoto(input.photoUrl),
        },
      })
      await tx.employeeService.deleteMany({ where: { employeeId } })
      await tx.employeeService.createMany({
        data: [...new Set(input.serviceIds)].map((serviceId) => ({ employeeId, serviceId })),
      })
      return tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
        include: { user: true, services: { include: { service: true } } },
      })
    })
  },
  async updateStatus(employeeId: string, rawStatus: unknown, requester: AuthUser | null) {
    const status = employeeStatusSchema.parse(rawStatus)
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee)
      throw new GraphQLError('Especialista não encontrado', { extensions: { code: 'NOT_FOUND' } })
    await requireSalonManager(employee.salonId, requester)
    return prisma.employee.update({
      where: { id: employeeId },
      data: { status },
      include: { user: true, services: { include: { service: true } } },
    })
  },
}
