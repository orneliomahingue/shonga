import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireRoles } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'

const pageSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING']).optional() })
const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING'])
const userInclude = { roles: { include: { role: true } } } as const

export const usersService = {
  async stats(requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const [users, activeUsers, blockedUsers, salons, approvedSalons, pendingSalons] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.user.count({ where: { deletedAt: null, status: 'BLOCKED' } }),
      prisma.salon.count({ where: { deletedAt: null } }),
      prisma.salon.count({ where: { deletedAt: null, status: 'APPROVED' } }),
      prisma.salon.count({ where: { deletedAt: null, status: 'PENDING' } }),
    ])
    return { users, activeUsers, blockedUsers, salons, approvedSalons, pendingSalons }
  },
  async list(rawInput: unknown, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const input = pageSchema.parse(rawInput ?? {})
    const where = { deletedAt: null, ...(input.status ? { status: input.status } : {}), ...(input.search ? { OR: [{ email: { contains: input.search, mode: 'insensitive' as const } }, { firstName: { contains: input.search, mode: 'insensitive' as const } }, { lastName: { contains: input.search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await prisma.$transaction([prisma.user.findMany({ where, include: userInclude, orderBy: { createdAt: 'desc' }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }), prisma.user.count({ where })])
    return { items, total, page: input.page, pageSize: input.pageSize }
  },
  async roles(requester: AuthUser | null) { requireRoles(requester, ['ADMIN']); return prisma.role.findMany({ orderBy: { name: 'asc' } }) },
  async updateStatus(userId: string, rawStatus: unknown, requester: AuthUser | null) {
    const admin = requireRoles(requester, ['ADMIN']); const status = statusSchema.parse(rawStatus)
    if (admin.id === userId && status !== 'ACTIVE') throw new GraphQLError('Não pode bloquear a própria conta', { extensions: { code: 'BAD_USER_INPUT' } })
    return prisma.user.update({ where: { id: userId }, data: { status }, include: userInclude })
  },
  async assignRole(userId: string, roleName: string, requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) throw new GraphQLError('Perfil não encontrado', { extensions: { code: 'BAD_USER_INPUT' } })
    await prisma.userRole.upsert({ where: { userId_roleId: { userId, roleId: role.id } }, update: {}, create: { userId, roleId: role.id } })
    return prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude })
  },
}
