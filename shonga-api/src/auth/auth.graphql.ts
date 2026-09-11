import { gql } from 'graphql-tag'
import { authService } from './auth.service.js'
import type { GraphQLContext } from './auth.types.js'

export const authTypeDefs = gql`
  input RegisterInput { email: String!, password: String!, firstName: String!, lastName: String!, phone: String }
  input LoginInput { email: String!, password: String! }
  type AuthUser { id: ID!, email: String!, firstName: String!, lastName: String!, phone: String, roles: [String!]! }
  type AuthPayload { accessToken: String!, refreshToken: String!, expiresIn: Int!, user: AuthUser! }
  extend type Query { me: AuthUser! }
  extend type Mutation { register(input: RegisterInput!): AuthPayload!, login(input: LoginInput!): AuthPayload!, refreshToken(token: String!): AuthPayload!, logout(refreshToken: String!): Boolean! }
`

export const authResolvers = {
  Query: { me: (_parent: unknown, _args: unknown, context: GraphQLContext) => authService.me(context.authUser) },
  Mutation: {
    register: (_parent: unknown, { input }: { input: unknown }, context: GraphQLContext) => authService.register(input, context.requestMetadata),
    login: (_parent: unknown, { input }: { input: unknown }, context: GraphQLContext) => authService.login(input, context.requestMetadata),
    refreshToken: (_parent: unknown, { token }: { token: string }, context: GraphQLContext) => authService.refresh(token, context.requestMetadata),
    logout: (_parent: unknown, { refreshToken }: { refreshToken: string }) => authService.logout(refreshToken),
  },
}
