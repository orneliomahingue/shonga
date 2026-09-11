import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireAuth, requireRoles } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from './salon-access.js'

const logoUrlSchema = z
  .string()
  .refine((value) => value.startsWith('data:image/jpeg;base64,'), 'Foto do salão inválida')
  .refine((value) => value.length <= 750_000, 'Foto do salão demasiado grande')
  .optional()
const salonInput = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  nuit: z.string().trim().min(5).max(30),
  phone: z.string().trim().min(8).max(20),
  email: z.email().toLowerCase().optional(),
  address: z.string().trim().min(5).max(250),
  province: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  logoUrl: logoUrlSchema,
})
const salonUpdateInput = salonInput.extend({
  description: z.string().trim().max(2000).nullable().optional(),
  email: z.email().toLowerCase().nullable().optional(),
  neighborhood: z.string().trim().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  logoUrl: logoUrlSchema.nullable(),
})
const statusSchema = z.enum(['PENDING', 'APPROVED', 'BLOCKED', 'INACTIVE'])
const slugify = (name: string) =>
  `${name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${crypto.randomUUID().slice(0, 8)}`

export const salonsService = {
  async provinces() {
    return prisma.province.findMany({
      include: { districts: { orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })
  },
  async register(rawInput: unknown, requester: AuthUser | null) {
    const user = requireAuth(requester)
    const input = salonInput.parse(rawInput)
    const ownerRole = await prisma.role.findUnique({ where: { name: 'SALON_OWNER' } })
    if (!ownerRole)
      throw new GraphQLError('Perfil SALON_OWNER não configurado', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      })
    return prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
        update: {},
        create: { userId: user.id, roleId: ownerRole.id },
      })
      return tx.salon.create({ data: { ...input, slug: slugify(input.name), ownerId: user.id } })
    })
  },
  async update(salonId: string, rawInput: unknown, requester: AuthUser | null) {
    await requireSalonManager(salonId, requester)
    const input = salonUpdateInput.parse(rawInput)
    return prisma.salon.update({ where: { id: salonId }, data: input })
  },
  async publicList(search?: string) {
    return prisma.salon.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
                { services: { some: { name: { contains: search }, status: 'ACTIVE' } } },
              ],
            }
          : {}),
      },
      include: {
        services: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: { category: true },
          orderBy: { price: 'asc' },
          take: 6,
        },
      },
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
      take: 50,
    })
  },
  async mine(requester: AuthUser | null) {
    const user = requireAuth(requester)
    return prisma.salon.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  },
  async adminList(status: unknown, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const parsed = status ? statusSchema.parse(status) : undefined
    return prisma.salon.findMany({
      where: { deletedAt: null, ...(parsed ? { status: parsed } : {}) },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    })
  },
  async updateStatus(salonId: string, rawStatus: unknown, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const status = statusSchema.parse(rawStatus)
    return prisma.salon.update({
      where: { id: salonId },
      data: { status },
      include: { owner: true },
    })
  },
}
