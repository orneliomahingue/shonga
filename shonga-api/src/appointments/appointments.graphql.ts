import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { appointmentsService } from './appointments.service.js'

export const appointmentsTypeDefs = gql`
  enum AppointmentStatus { PENDING AWAITING_PAYMENT CONFIRMED IN_PROGRESS COMPLETED CANCELLED NO_SHOW RESCHEDULED }
  input CreateAppointmentInput { serviceId: ID!, employeeId: ID!, startsAt: String!, notes: String }
  type AppointmentPerson { id: ID!, firstName: String!, lastName: String! }
  type AppointmentHistory { fromStatus: AppointmentStatus, toStatus: AppointmentStatus!, reason: String, createdAt: String! }
  type Appointment { id: ID!, salonId: ID!, salonName: String!, serviceId: ID!, serviceName: String!, employee: AppointmentPerson!, customer: AppointmentPerson!, startsAt: String!, endsAt: String!, total: Float!, notes: String, status: AppointmentStatus!, history: [AppointmentHistory!]!, createdAt: String! }
  extend type Query { myAppointments: [Appointment!]!, salonAppointments(salonId: ID!): [Appointment!]! }
  extend type Mutation { createAppointment(input: CreateAppointmentInput!): Appointment!, updateAppointmentStatus(id: ID!, status: AppointmentStatus!, reason: String): Appointment! }
`
export const appointmentsResolvers = {
  Query: { myAppointments: (_: unknown, _args: unknown, context: GraphQLContext) => appointmentsService.mine(context.authUser), salonAppointments: (_: unknown, { salonId }: { salonId: string }, context: GraphQLContext) => appointmentsService.salonAppointments(salonId, context.authUser) },
  Mutation: { createAppointment: (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => appointmentsService.create(input, context.authUser), updateAppointmentStatus: (_: unknown, args: { id: string; status: unknown; reason?: string }, context: GraphQLContext) => appointmentsService.updateStatus(args.id, args.status, args.reason, context.authUser) },
  Appointment: { salonName: (item: { salon: { name: string } }) => item.salon.name, serviceName: (item: { service: { name: string } }) => item.service.name, employee: (item: { employee: { id: string; user: { firstName: string; lastName: string } } }) => ({ ...item.employee.user, id: item.employee.id }), customer: (item: { customer: { id: string; user: { firstName: string; lastName: string } } }) => ({ ...item.customer.user, id: item.customer.id }), startsAt: (item: { startsAt: Date }) => item.startsAt.toISOString(), endsAt: (item: { endsAt: Date }) => item.endsAt.toISOString(), total: (item: { total: { toNumber(): number } }) => item.total.toNumber(), createdAt: (item: { createdAt: Date }) => item.createdAt.toISOString() },
  AppointmentHistory: { createdAt: (item: { createdAt: Date }) => item.createdAt.toISOString() },
}
