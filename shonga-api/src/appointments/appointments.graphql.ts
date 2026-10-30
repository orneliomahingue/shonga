import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { appointmentsService } from './appointments.service.js'
import { realtime } from '../realtime/realtime.js'

export const appointmentsTypeDefs = gql`
  enum AppointmentStatus {
    PENDING
    AWAITING_PAYMENT
    CONFIRMED
    IN_PROGRESS
    COMPLETED
    CANCELLED
    NO_SHOW
    RESCHEDULED
  }
  input CreateAppointmentInput {
    serviceId: ID!
    employeeId: ID!
    startsAt: String!
    notes: String
  }
  type AppointmentPerson {
    id: ID!
    firstName: String!
    lastName: String!
  }
  type AppointmentHistory {
    fromStatus: AppointmentStatus
    toStatus: AppointmentStatus!
    reason: String
    createdAt: String!
  }
  type Appointment {
    id: ID!
    salonId: ID!
    salonName: String!
    serviceId: ID!
    serviceName: String!
    employee: AppointmentPerson!
    customer: AppointmentPerson!
    startsAt: String!
    endsAt: String!
    total: Float!
    notes: String
    status: AppointmentStatus!
    payment: Payment
    history: [AppointmentHistory!]!
    createdAt: String!
  }
  extend type Query {
    myAppointments: [Appointment!]!
    salonAppointments(salonId: ID!): [Appointment!]!
  }
  extend type Mutation {
    createAppointment(input: CreateAppointmentInput!): Appointment!
    updateAppointmentStatus(id: ID!, status: AppointmentStatus!, reason: String): Appointment!
  }
`
export const appointmentsResolvers = {
  Query: {
    myAppointments: (_: unknown, _args: unknown, context: GraphQLContext) =>
      appointmentsService.mine(context.authUser),
    salonAppointments: (_: unknown, { salonId }: { salonId: string }, context: GraphQLContext) =>
      appointmentsService.salonAppointments(salonId, context.authUser),
  },
  Mutation: {
    createAppointment: async (
      _: unknown,
      { input }: { input: unknown },
      context: GraphQLContext,
    ) => {
      const appointment = await appointmentsService.create(input, context.authUser)
      void realtime.appointment(
        appointment.id,
        {
          type: 'APPOINTMENT_CREATED',
          title: 'Nova marcação',
          message: `${appointment.service.name} foi reservado.`,
          status: appointment.status,
        },
        ['salon'],
      )
      return appointment
    },
    updateAppointmentStatus: async (
      _: unknown,
      args: { id: string; status: unknown; reason?: string },
      context: GraphQLContext,
    ) => {
      const appointment = await appointmentsService.updateStatus(
        args.id,
        args.status,
        args.reason,
        context.authUser,
      )
      const labels: Record<string, string> = {
        CONFIRMED: 'Marcação confirmada',
        IN_PROGRESS: 'Atendimento iniciado',
        COMPLETED: 'Serviço concluído',
        CANCELLED: 'Marcação cancelada',
        NO_SHOW: 'Falta registada',
      }
      const wasRefunded = appointment.payment?.status === 'REFUNDED'
      const refundAmount = appointment.payment?.refundAmount?.toNumber()
      const feeAmount = appointment.payment?.transactionFeeAmount?.toNumber()
      void realtime.appointment(appointment.id, {
        type: wasRefunded
          ? 'PAYMENT_REFUNDED'
          : appointment.status === 'CANCELLED'
            ? 'APPOINTMENT_CANCELLED'
            : 'APPOINTMENT_UPDATED',
        title: wasRefunded ? 'Reembolso M-Pesa processado' : labels[appointment.status] ?? 'Marcação atualizada',
        message: wasRefunded
          ? `${refundAmount?.toFixed(2)} MT foram devolvidos. ${feeAmount?.toFixed(2)} MT foram descontados como taxa da carteira móvel.`
          : args.reason ?? `Novo estado: ${appointment.status}`,
        status: appointment.status,
      })
      return appointment
    },
  },
  Appointment: {
    salonName: (item: { salon: { name: string } }) => item.salon.name,
    serviceName: (item: { service: { name: string } }) => item.service.name,
    employee: (item: {
      employee: { id: string; user: { firstName: string; lastName: string } }
    }) => ({ ...item.employee.user, id: item.employee.id }),
    customer: (item: {
      customer: { id: string; user: { firstName: string; lastName: string } }
    }) => ({ ...item.customer.user, id: item.customer.id }),
    startsAt: (item: { startsAt: Date }) => item.startsAt.toISOString(),
    endsAt: (item: { endsAt: Date }) => item.endsAt.toISOString(),
    total: (item: { total: { toNumber(): number } }) => item.total.toNumber(),
    createdAt: (item: { createdAt: Date }) => item.createdAt.toISOString(),
  },
  AppointmentHistory: { createdAt: (item: { createdAt: Date }) => item.createdAt.toISOString() },
}
