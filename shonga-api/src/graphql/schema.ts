import { gql } from 'graphql-tag'
import { prisma } from '../database/prisma.js'
import { authResolvers, authTypeDefs } from '../auth/auth.graphql.js'
import { usersResolvers, usersTypeDefs } from '../users/users.graphql.js'
import { salonsResolvers, salonsTypeDefs } from '../salons/salons.graphql.js'
import { catalogResolvers, catalogTypeDefs } from '../catalog/catalog.graphql.js'
import { employeesResolvers, employeesTypeDefs } from '../employees/employees.graphql.js'
import { schedulesResolvers, schedulesTypeDefs } from '../schedules/schedules.graphql.js'
import { appointmentsResolvers, appointmentsTypeDefs } from '../appointments/appointments.graphql.js'

export const typeDefs = gql`
  type Health { status: String!, database: String!, timestamp: String! }
  type Query { health: Health! }
  type Mutation { _empty: Boolean }
  ${authTypeDefs}
  ${usersTypeDefs}
  ${salonsTypeDefs}
  ${catalogTypeDefs}
  ${employeesTypeDefs}
  ${schedulesTypeDefs}
  ${appointmentsTypeDefs}
`

export const resolvers = {
  Mutation: { ...authResolvers.Mutation, ...usersResolvers.Mutation, ...salonsResolvers.Mutation, ...catalogResolvers.Mutation, ...employeesResolvers.Mutation, ...schedulesResolvers.Mutation, ...appointmentsResolvers.Mutation },
  Query: {
    ...authResolvers.Query,
    ...usersResolvers.Query,
    ...salonsResolvers.Query,
    ...catalogResolvers.Query,
    ...employeesResolvers.Query,
    ...schedulesResolvers.Query,
    ...appointmentsResolvers.Query,
    health: async () => {
      let database = 'connected'
      try { await prisma.$queryRaw`SELECT 1` } catch { database = 'unavailable' }
      return { status: 'ok', database, timestamp: new Date().toISOString() }
    },
  },
  PlatformUser: usersResolvers.PlatformUser,
  Salon: salonsResolvers.Salon,
  SalonPreviewService: salonsResolvers.SalonPreviewService,
  SalonService: catalogResolvers.SalonService,
  WorkingHour: schedulesResolvers.WorkingHour,
  EmployeeTimeOff: schedulesResolvers.EmployeeTimeOff,
  Appointment: appointmentsResolvers.Appointment,
  AppointmentHistory: appointmentsResolvers.AppointmentHistory,
}
