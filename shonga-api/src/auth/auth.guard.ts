import { GraphQLError } from 'graphql'
import type { AuthUser } from './auth.types.js'

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new GraphQLError('Autenticação necessária', { extensions: { code: 'UNAUTHENTICATED' } })
  return user
}

export function requireRoles(user: AuthUser | null, allowedRoles: string[]): AuthUser {
  const authenticated = requireAuth(user)
  if (!authenticated.roles.some((role) => allowedRoles.includes(role))) {
    throw new GraphQLError('Não possui permissão para esta operação', { extensions: { code: 'FORBIDDEN' } })
  }
  return authenticated
}
