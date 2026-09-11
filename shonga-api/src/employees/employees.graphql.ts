import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { employeesService } from './employees.service.js'

export const employeesTypeDefs = gql`
  enum EmployeeStatus {
    ACTIVE
    INACTIVE
    ON_LEAVE
  }
  input EmployeeInput {
    salonId: ID!
    email: String!
    temporaryPassword: String!
    firstName: String!
    lastName: String!
    phone: String
    jobTitle: String!
    specialty: String
    photoUrl: String
    serviceIds: [ID!] = []
  }
  input EmployeeUpdateInput {
    firstName: String!
    lastName: String!
    jobTitle: String!
    specialty: String
    photoUrl: String
    serviceIds: [ID!] = []
  }
  type EmployeeServiceSummary {
    id: ID!
    name: String!
  }
  type SalonEmployee {
    id: ID!
    salonId: ID!
    email: String!
    firstName: String!
    lastName: String!
    phone: String
    jobTitle: String!
    specialty: String
    photoUrl: String
    status: EmployeeStatus!
    services: [EmployeeServiceSummary!]!
  }
  type FeaturedSpecialist {
    id: ID!
    salonId: ID!
    salonName: String!
    firstName: String!
    lastName: String!
    specialty: String
    photoUrl: String
    services: [EmployeeServiceSummary!]!
  }
  extend type Query {
    salonEmployees(salonId: ID!): [SalonEmployee!]!
    featuredSpecialists(limit: Int = 10): [FeaturedSpecialist!]!
  }
  extend type Mutation {
    createSalonEmployee(input: EmployeeInput!): SalonEmployee!
    updateSalonEmployee(id: ID!, input: EmployeeUpdateInput!): SalonEmployee!
    updateSalonEmployeeStatus(id: ID!, status: EmployeeStatus!): SalonEmployee!
    setEmployeeServices(employeeId: ID!, serviceIds: [ID!]!): SalonEmployee!
  }
`
const mapEmployee = (employee: {
  user: { email: string; firstName: string; lastName: string; phone: string | null }
  services: { service: { id: string; name: string } }[]
}) => ({ ...employee.user, ...employee, services: employee.services.map(({ service }) => service) })
export const employeesResolvers = {
  Query: {
    salonEmployees: async (_: unknown, { salonId }: { salonId: string }, context: GraphQLContext) =>
      (await employeesService.list(salonId, context.authUser)).map(mapEmployee),
    featuredSpecialists: async (_: unknown, { limit }: { limit?: number }) =>
      (await employeesService.featured(limit)).map((employee) => ({
        ...employee.user,
        ...employee,
        salonName: employee.salon.name,
        services: employee.services.map(({ service }) => service),
      })),
  },
  Mutation: {
    createSalonEmployee: async (
      _: unknown,
      { input }: { input: unknown },
      context: GraphQLContext,
    ) => mapEmployee(await employeesService.create(input, context.authUser)),
    updateSalonEmployee: async (
      _: unknown,
      args: { id: string; input: unknown },
      context: GraphQLContext,
    ) => mapEmployee(await employeesService.update(args.id, args.input, context.authUser)),
    updateSalonEmployeeStatus: async (
      _: unknown,
      args: { id: string; status: unknown },
      context: GraphQLContext,
    ) => mapEmployee(await employeesService.updateStatus(args.id, args.status, context.authUser)),
    setEmployeeServices: async (
      _: unknown,
      args: { employeeId: string; serviceIds: string[] },
      context: GraphQLContext,
    ) =>
      mapEmployee(
        await employeesService.setServices(args.employeeId, args.serviceIds, context.authUser),
      ),
  },
}
