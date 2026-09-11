import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { salonsService } from './salons.service.js'

export const salonsTypeDefs = gql`
  enum SalonStatus {
    PENDING
    APPROVED
    BLOCKED
    INACTIVE
  }
  input RegisterSalonInput {
    name: String!
    description: String
    nuit: String!
    phone: String!
    email: String
    address: String!
    province: String!
    district: String!
    neighborhood: String
    latitude: Float
    longitude: Float
    logoUrl: String
  }
  input UpdateSalonInput {
    name: String!
    description: String
    nuit: String!
    phone: String!
    email: String
    address: String!
    province: String!
    district: String!
    neighborhood: String
    latitude: Float
    longitude: Float
    logoUrl: String
  }
  type SalonOwner {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
  }
  type SalonPreviewService {
    id: ID!
    name: String!
    price: Float!
    categoryName: String!
  }
  type District {
    id: ID!
    name: String!
  }
  type Province {
    id: ID!
    name: String!
    districts: [District!]!
  }
  type Salon {
    id: ID!
    name: String!
    slug: String!
    description: String
    nuit: String!
    phone: String!
    email: String
    address: String!
    province: String!
    district: String!
    neighborhood: String
    latitude: Float
    longitude: Float
    logoUrl: String
    rating: Float!
    status: SalonStatus!
    owner: SalonOwner
    services: [SalonPreviewService!]!
    minPrice: Float
    createdAt: String!
  }
  extend type Query {
    salons(search: String): [Salon!]!
    mySalons: [Salon!]!
    adminSalons(status: SalonStatus): [Salon!]!
    provinces: [Province!]!
  }
  extend type Mutation {
    registerSalon(input: RegisterSalonInput!): Salon!
    updateSalon(salonId: ID!, input: UpdateSalonInput!): Salon!
    updateSalonStatus(salonId: ID!, status: SalonStatus!): Salon!
  }
`
export const salonsResolvers = {
  Query: {
    salons: (_: unknown, { search }: { search?: string }) => salonsService.publicList(search),
    mySalons: (_: unknown, _args: unknown, context: GraphQLContext) =>
      salonsService.mine(context.authUser),
    adminSalons: (_: unknown, { status }: { status?: unknown }, context: GraphQLContext) =>
      salonsService.adminList(status, context.authUser),
    provinces: () => salonsService.provinces(),
  },
  Mutation: {
    registerSalon: (_: unknown, { input }: { input: unknown }, context: GraphQLContext) =>
      salonsService.register(input, context.authUser),
    updateSalon: (_: unknown, args: { salonId: string; input: unknown }, context: GraphQLContext) =>
      salonsService.update(args.salonId, args.input, context.authUser),
    updateSalonStatus: (
      _: unknown,
      args: { salonId: string; status: unknown },
      context: GraphQLContext,
    ) => salonsService.updateStatus(args.salonId, args.status, context.authUser),
  },
  Salon: {
    latitude: (salon: { latitude: { toNumber(): number } | null }) =>
      salon.latitude?.toNumber() ?? null,
    longitude: (salon: { longitude: { toNumber(): number } | null }) =>
      salon.longitude?.toNumber() ?? null,
    rating: (salon: { rating: { toNumber(): number } }) => salon.rating.toNumber(),
    minPrice: (salon: { services?: { price: { toNumber(): number } }[] }) =>
      salon.services?.[0]?.price.toNumber() ?? null,
    createdAt: (salon: { createdAt: Date }) => salon.createdAt.toISOString(),
  },
  SalonPreviewService: {
    price: (service: { price: { toNumber(): number } }) => service.price.toNumber(),
    categoryName: (service: { category: { name: string } }) => service.category.name,
  },
}
