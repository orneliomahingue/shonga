import argon2 from 'argon2'
import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { prisma } from '../database/prisma.js'
import type { AuthUser, RequestMetadata } from './auth.types.js'
import { tokenService } from './token.service.js'
import { requireAuth } from './auth.guard.js'

const registerSchema = z.object({ email: z.email().toLowerCase(), password: z.string().min(8).max(128), firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), phone: z.string().trim().min(8).max(20).optional() })
const loginSchema = z.object({ email: z.email().toLowerCase(), password: z.string().min(1) })
const unauthorized = (message = 'Credenciais inválidas') => new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } })

type UserWithRoles = { id: string; email: string; firstName: string; lastName: string; phone: string | null; roles: { role: { name: string } }[] }
const toAuthUser = (user: UserWithRoles): AuthUser => ({ id: user.id, email: user.email, roles: user.roles.map(({ role }) => role.name) })
const publicUser = (user: UserWithRoles) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, roles: user.roles.map(({ role }) => role.name) })

async function issueTokens(user: AuthUser, metadata: RequestMetadata) {
  const [accessToken, refreshToken] = await Promise.all([tokenService.signAccess(user), tokenService.signRefresh(user)])
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: tokenService.hash(refreshToken), expiresAt: new Date(Date.now() + tokenService.refreshLifetimeSeconds * 1000), ...metadata } })
  return { accessToken, refreshToken, expiresIn: tokenService.accessLifetimeSeconds }
}

export const authService = {
  async register(rawInput: unknown, metadata: RequestMetadata) {
    const input = registerSchema.parse(rawInput)
    const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })
    if (exists) throw new GraphQLError('Este email já está registado', { extensions: { code: 'BAD_USER_INPUT' } })
    const role = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } })
    if (!role) throw new GraphQLError('Perfil CUSTOMER não configurado', { extensions: { code: 'INTERNAL_SERVER_ERROR' } })
    const passwordHash = await argon2.hash(input.password)
    const user = await prisma.user.create({ data: { email: input.email, firstName: input.firstName, lastName: input.lastName, phone: input.phone, passwordHash, roles: { create: { roleId: role.id } }, customer: { create: {} } }, include: { roles: { include: { role: true } } } })
    return { ...(await issueTokens(toAuthUser(user), metadata)), user: publicUser(user) }
  },
  async login(rawInput: unknown, metadata: RequestMetadata) {
    const input = loginSchema.parse(rawInput)
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { roles: { include: { role: true } } } })
    if (!user || user.deletedAt || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, input.password))) throw unauthorized()
    return { ...(await issueTokens(toAuthUser(user), metadata)), user: publicUser(user) }
  },
  async refresh(refreshToken: string, metadata: RequestMetadata) {
    let userId: string
    try { userId = await tokenService.verifyRefresh(refreshToken) } catch { throw unauthorized('Refresh token inválido ou expirado') }
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: tokenService.hash(refreshToken) }, include: { user: { include: { roles: { include: { role: true } } } } } })
    if (!stored || stored.userId !== userId || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status !== 'ACTIVE') throw unauthorized('Refresh token inválido ou expirado')
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
    return { ...(await issueTokens(toAuthUser(stored.user), metadata)), user: publicUser(stored.user) }
  },
  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({ where: { tokenHash: tokenService.hash(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } })
    return true
  },
  async me(authUser: AuthUser | null) {
    const authenticated = requireAuth(authUser)
    const user = await prisma.user.findUnique({ where: { id: authenticated.id }, include: { roles: { include: { role: true } } } })
    if (!user || user.deletedAt || user.status !== 'ACTIVE') throw unauthorized()
    return publicUser(user)
  },
}
