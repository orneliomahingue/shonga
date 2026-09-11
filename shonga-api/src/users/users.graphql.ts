import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { usersService } from './users.service.js'

export const usersTypeDefs = gql`
  enum UserStatus { ACTIVE INACTIVE BLOCKED PENDING }
  input UsersFilter { page: Int = 1, pageSize: Int = 20, search: String, status: UserStatus }
  type PlatformUser { id: ID!, email: String!, firstName: String!, lastName: String!, phone: String, status: UserStatus!, roles: [String!]!, createdAt: String! }
  type UsersPage { items: [PlatformUser!]!, total: Int!, page: Int!, pageSize: Int! }
  type Role { id: ID!, name: String!, description: String }
  type AdminStats { users: Int!, activeUsers: Int!, blockedUsers: Int!, salons: Int!, approvedSalons: Int!, pendingSalons: Int! }
  extend type Query { users(filter: UsersFilter): UsersPage!, roles: [Role!]!, adminStats: AdminStats! }
  extend type Mutation { updateUserStatus(userId: ID!, status: UserStatus!): PlatformUser!, assignUserRole(userId: ID!, roleName: String!): PlatformUser! }
`

const mapUser = (user: { roles: { role: { name: string } }[] }) => ({ ...user, roles: user.roles.map(({ role }) => role.name) })
export const usersResolvers = {
  Query: { users: async (_: unknown, { filter }: { filter?: unknown }, context: GraphQLContext) => { const page = await usersService.list(filter, context.authUser); return { ...page, items: page.items.map(mapUser) } }, roles: (_: unknown, _args: unknown, context: GraphQLContext) => usersService.roles(context.authUser), adminStats: (_: unknown, _args: unknown, context: GraphQLContext) => usersService.stats(context.authUser) },
  Mutation: { updateUserStatus: async (_: unknown, args: { userId: string; status: unknown }, context: GraphQLContext) => mapUser(await usersService.updateStatus(args.userId, args.status, context.authUser)), assignUserRole: async (_: unknown, args: { userId: string; roleName: string }, context: GraphQLContext) => mapUser(await usersService.assignRole(args.userId, args.roleName, context.authUser)) },
  PlatformUser: { createdAt: (user: { createdAt: Date }) => user.createdAt.toISOString() },
}
