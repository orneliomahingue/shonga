import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { catalogService } from './catalog.service.js'

export const catalogTypeDefs = gql`
  enum ServiceStatus { ACTIVE INACTIVE }
  input CategoryInput { name: String!, description: String }
  input ServiceInput { salonId: ID!, categoryId: ID!, name: String!, description: String, price: Float!, durationMin: Int!, imageUrl: String }
  input ServiceUpdateInput { categoryId: ID!, name: String!, description: String, price: Float!, durationMin: Int!, imageUrl: String }
  type ServiceCategory { id: ID!, name: String!, slug: String!, description: String, active: Boolean! }
  type ServiceSpecialist { id: ID!, firstName: String!, lastName: String!, specialty: String, photoUrl: String }
  type SalonService { id: ID!, salonId: ID!, name: String!, description: String, price: Float!, durationMin: Int!, imageUrl: String, status: ServiceStatus!, category: ServiceCategory!, specialists: [ServiceSpecialist!]! }
  extend type Query { serviceCategories: [ServiceCategory!]!, salonServices(salonId: ID!): [SalonService!]!, managedSalonServices(salonId: ID!): [SalonService!]! }
  extend type Mutation { createServiceCategory(input: CategoryInput!): ServiceCategory!, setServiceCategoryActive(id: ID!, active: Boolean!): ServiceCategory!, createSalonService(input: ServiceInput!): SalonService!, updateSalonService(id: ID!, input: ServiceUpdateInput!): SalonService!, setSalonServiceStatus(id: ID!, status: ServiceStatus!): SalonService! }
`

const specialists = (service: { specialists: { employee: { id: string; specialty: string | null; photoUrl: string | null; user: { firstName: string; lastName: string } } }[] }) => service.specialists.map(({ employee }) => ({ id: employee.id, firstName: employee.user.firstName, lastName: employee.user.lastName, specialty: employee.specialty, photoUrl: employee.photoUrl }))
export const catalogResolvers = {
  Query: { serviceCategories: () => catalogService.categories(), salonServices: (_: unknown, { salonId }: { salonId: string }) => catalogService.services(salonId), managedSalonServices: (_: unknown, { salonId }: { salonId: string }, context: GraphQLContext) => catalogService.managedServices(salonId, context.authUser) },
  Mutation: { createServiceCategory: (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => catalogService.createCategory(input, context.authUser), setServiceCategoryActive: (_: unknown, args: { id: string; active: boolean }, context: GraphQLContext) => catalogService.setCategoryActive(args.id, args.active, context.authUser), createSalonService: (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => catalogService.createService(input, context.authUser), updateSalonService: (_: unknown, args: { id: string; input: unknown }, context: GraphQLContext) => catalogService.updateService(args.id, args.input, context.authUser), setSalonServiceStatus: (_: unknown, args: { id: string; status: unknown }, context: GraphQLContext) => catalogService.setServiceStatus(args.id, args.status, context.authUser) },
  SalonService: { price: (service: { price: { toNumber(): number } }) => service.price.toNumber(), specialists },
}
