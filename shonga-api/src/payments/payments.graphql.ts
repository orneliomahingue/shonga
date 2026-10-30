import { gql } from 'graphql-tag'
import type { GraphQLContext } from '../auth/auth.types.js'
import { paymentsService } from './payments.service.js'

export const paymentsTypeDefs = gql`
  enum PaymentStatus { CREATED PENDING HELD FAILED EXPIRED DISPUTED RELEASED REFUNDED CANCELLED }
  enum PaymentProvider { MPESA }
  type PaymentEvent { fromStatus: PaymentStatus, toStatus: PaymentStatus!, source: String!, detail: String, createdAt: String! }
  type Payment { id: ID!, reference: String!, appointmentId: ID!, provider: PaymentProvider!, status: PaymentStatus!, phone: String!, amount: Float!, commissionAmount: Float!, salonAmount: Float!, refundAmount: Float, transactionFeeAmount: Float, providerMessage: String, expiresAt: String!, paidAt: String, releasedAt: String, refundedAt: String, events: [PaymentEvent!]! }
  type ServiceCredentials { pin: String!, qrPayload: String!, expiresAt: String! }
  enum DisputeDecision { REFUND_CUSTOMER RELEASE_SALON }
  type PaymentDispute { payment: Payment!, serviceName: String!, salonName: String!, customerName: String!, appointmentStatus: AppointmentStatus!, reason: String!, openedAt: String! }
  extend type Query { appointmentPayment(appointmentId: ID!): Payment, serviceCredentials(appointmentId: ID!): ServiceCredentials!, paymentDisputes: [PaymentDispute!]! }
  extend type Mutation { startMpesaPayment(appointmentId: ID!, phone: String!): Payment!, confirmService(appointmentId: ID!, proof: String!): Payment!, openPaymentDispute(appointmentId: ID!, reason: String!): Payment!, resolvePaymentDispute(paymentId: ID!, decision: DisputeDecision!, reason: String!): Payment! }
`

export const paymentsResolvers = {
  Query: {
    appointmentPayment: (_: unknown, { appointmentId }: { appointmentId: string }, context: GraphQLContext) => paymentsService.byAppointment(appointmentId, context.authUser),
    serviceCredentials: (_: unknown, { appointmentId }: { appointmentId: string }, context: GraphQLContext) => paymentsService.credentials(appointmentId, context.authUser),
    paymentDisputes: (_: unknown, _args: unknown, context: GraphQLContext) => paymentsService.disputes(context.authUser),
  },
  Mutation: {
    startMpesaPayment: (_: unknown, args: { appointmentId: string; phone: string }, context: GraphQLContext) => paymentsService.start(args.appointmentId, args.phone, context.authUser),
    confirmService: (_: unknown, args: { appointmentId: string; proof: string }, context: GraphQLContext) => paymentsService.confirmService(args.appointmentId, args.proof, context.authUser),
    openPaymentDispute: (_: unknown, args: { appointmentId: string; reason: string }, context: GraphQLContext) => paymentsService.dispute(args.appointmentId, args.reason, context.authUser),
    resolvePaymentDispute: (_: unknown, args: { paymentId: string; decision: unknown; reason: unknown }, context: GraphQLContext) => paymentsService.resolveDispute(args.paymentId, args.decision, args.reason, context.authUser),
  },
  Payment: {
    amount: (item: { amount: { toNumber(): number } }) => item.amount.toNumber(),
    commissionAmount: (item: { commissionAmount: { toNumber(): number } }) => item.commissionAmount.toNumber(),
    salonAmount: (item: { salonAmount: { toNumber(): number } }) => item.salonAmount.toNumber(),
    refundAmount: (item: { refundAmount?: { toNumber(): number } }) => item.refundAmount?.toNumber(),
    transactionFeeAmount: (item: { transactionFeeAmount?: { toNumber(): number } }) => item.transactionFeeAmount?.toNumber(),
    expiresAt: (item: { expiresAt: Date }) => item.expiresAt.toISOString(),
    paidAt: (item: { paidAt?: Date }) => item.paidAt?.toISOString(), releasedAt: (item: { releasedAt?: Date }) => item.releasedAt?.toISOString(), refundedAt: (item: { refundedAt?: Date }) => item.refundedAt?.toISOString(),
  },
  PaymentEvent: { createdAt: (item: { createdAt: Date }) => item.createdAt.toISOString() },
  ServiceCredentials: { expiresAt: (item: { expiresAt: Date }) => item.expiresAt.toISOString() },
  PaymentDispute: { openedAt: (item: { openedAt: Date }) => item.openedAt.toISOString() },
}
