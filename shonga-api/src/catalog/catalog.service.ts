import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireRoles } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
})
const serviceSchema = z.object({
  salonId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive().max(10000000),
  durationMin: z.number().int().min(5).max(1440),
  imageUrl: z.url().optional(),
})
const serviceUpdateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive().max(10000000),
  durationMin: z.number().int().min(5).max(1440),
  imageUrl: z.url().optional(),
})
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const catalogService = {
  categories() {
    return prisma.serviceCategory.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: 'asc' },
    })
  },
  async createCategory(rawInput: unknown, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const input = categorySchema.parse(rawInput)
    const slug = slugify(input.name)
    return prisma.serviceCategory.create({ data: { ...input, slug } })
  },
  async setCategoryActive(id: string, active: boolean, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    return prisma.serviceCategory.update({ where: { id }, data: { active } })
  },
  services(salonId: string) {
    return prisma.service.findMany({
      where: { salonId, status: 'ACTIVE', deletedAt: null, salon: { status: 'APPROVED' } },
      include: {
        category: true,
        specialists: {
          where: { employee: { status: 'ACTIVE', deletedAt: null } },
          include: { employee: { include: { user: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
  },
  async managedServices(salonId: string, requester: AuthUser | null) {
    await requireSalonManager(salonId, requester)
    return prisma.service.findMany({
      where: { salonId, deletedAt: null },
      include: {
        category: true,
        specialists: { include: { employee: { include: { user: true } } } },
      },
      orderBy: { name: 'asc' },
    })
  },
  async createService(rawInput: unknown, requester: AuthUser | null) {
    const input = serviceSchema.parse(rawInput)
    await requireSalonManager(input.salonId, requester)
    const category = await prisma.serviceCategory.findFirst({
      where: { id: input.categoryId, active: true },
    })
    if (!category)
      throw new GraphQLError('Categoria inválida', { extensions: { code: 'BAD_USER_INPUT' } })
    return prisma.service.create({
      data: input,
      include: {
        category: true,
        specialists: { include: { employee: { include: { user: true } } } },
      },
    })
  },
  async setServiceStatus(id: string, status: unknown, requester: AuthUser | null) {
    const parsed = z.enum(['ACTIVE', 'INACTIVE']).parse(status)
    const service = await prisma.service.findUnique({ where: { id } })
    if (!service)
      throw new GraphQLError('Serviço não encontrado', { extensions: { code: 'NOT_FOUND' } })
    await requireSalonManager(service.salonId, requester)
    return prisma.service.update({
      where: { id },
      data: { status: parsed },
      include: {
        category: true,
        specialists: { include: { employee: { include: { user: true } } } },
      },
    })
  },
  async updateService(id: string, rawInput: unknown, requester: AuthUser | null) {
    const input = serviceUpdateSchema.parse(rawInput)
    const service = await prisma.service.findUnique({ where: { id } })
    if (!service)
      throw new GraphQLError('Serviço não encontrado', { extensions: { code: 'NOT_FOUND' } })
    await requireSalonManager(service.salonId, requester)
    const category = await prisma.serviceCategory.findFirst({
      where: { id: input.categoryId, active: true },
    })
    if (!category)
      throw new GraphQLError('Categoria inválida', { extensions: { code: 'BAD_USER_INPUT' } })
    return prisma.service.update({
      where: { id },
      data: input,
      include: {
        category: true,
        specialists: { include: { employee: { include: { user: true } } } },
      },
    })
  },
}
