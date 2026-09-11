import { GraphQLError } from 'graphql'
import type { AuthUser } from '../auth/auth.types.js'
import { requireAuth } from '../auth/auth.guard.js'
import { prisma } from '../database/prisma.js'

export async function requireSalonManager(salonId: string, requester: AuthUser | null) {
  const user = requireAuth(requester)
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true, ownerId: true } })
  if (!salon) throw new GraphQLError('Salão não encontrado', { extensions: { code: 'NOT_FOUND' } })
  if (salon.ownerId !== user.id && !user.roles.includes('ADMIN')) throw new GraphQLError('Não possui acesso a este salão', { extensions: { code: 'FORBIDDEN' } })
  return salon
}
