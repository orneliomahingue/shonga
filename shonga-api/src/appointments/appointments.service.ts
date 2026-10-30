import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireAuth } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'
import { requestMpesaRefund } from '../payments/mpesa.gateway.js'
import { env } from '../config/env.js'

const bookingSchema = z.object({ serviceId: z.string().uuid(), employeeId: z.string().uuid(), startsAt: z.iso.datetime({ offset: true }), notes: z.string().trim().max(1000).optional() })
const activeStatuses = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'] as const
const appointmentInclude = { salon: true, service: true, employee: { include: { user: true } }, customer: { include: { user: true } }, payment: true, history: { orderBy: { createdAt: 'asc' as const } } } as const
const transitions = { PENDING: ['AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED'], AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'], IN_PROGRESS: ['COMPLETED'], COMPLETED: [], CANCELLED: [], NO_SHOW: [], RESCHEDULED: [] } as const

const maputoParts = (date: Date) => { const local = new Date(date.getTime() + 2 * 60 * 60 * 1000); return { dayOfWeek: local.getUTCDay(), minute: local.getUTCHours() * 60 + local.getUTCMinutes() } }
const conflict = () => new GraphQLError('Este horário acabou de ficar indisponível. Escolha outro horário.', { extensions: { code: 'APPOINTMENT_CONFLICT' } })

export const appointmentsService = {
  async create(rawInput: unknown, requester: AuthUser | null) {
    const user = requireAuth(requester); const input = bookingSchema.parse(rawInput); const startsAt = new Date(input.startsAt)
    if (startsAt <= new Date()) throw new GraphQLError('Escolha um horário futuro', { extensions: { code: 'BAD_USER_INPUT' } })
    const customer = await prisma.customer.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, status: 'ACTIVE', salon: { status: 'APPROVED' }, specialists: { some: { employeeId: input.employeeId, employee: { status: 'ACTIVE' } } } } }); if (!service) throw new GraphQLError('Serviço ou especialista indisponível', { extensions: { code: 'BAD_USER_INPUT' } })
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60000); const { dayOfWeek, minute } = maputoParts(startsAt); const endMinute = minute + service.durationMin
    const withinSchedule = await prisma.workingHour.count({ where: { employeeId: input.employeeId, dayOfWeek, active: true, startMinute: { lte: minute }, endMinute: { gte: endMinute } } }); if (!withinSchedule) throw new GraphQLError('Horário fora do expediente do especialista', { extensions: { code: 'BAD_USER_INPUT' } })
    return prisma.$transaction(async (tx) => {
      const lockKey = `appointment:${input.employeeId}`
      const lock = await tx.$queryRaw<{ acquired: number }[]>`SELECT GET_LOCK(${lockKey}, 5) AS acquired`
      if (Number(lock[0]?.acquired) !== 1) throw conflict()
      try {
        const [timeOff, existing] = await Promise.all([tx.employeeTimeOff.findFirst({ where: { employeeId: input.employeeId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }), tx.appointment.findFirst({ where: { employeeId: input.employeeId, status: { in: [...activeStatuses] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } })])
        if (timeOff || existing) throw conflict()
        return await tx.appointment.create({ data: { salonId: service.salonId, customerId: customer.id, employeeId: input.employeeId, serviceId: service.id, startsAt, endsAt, total: service.price, notes: input.notes, history: { create: { toStatus: 'PENDING', changedById: user.id } } }, include: appointmentInclude })
      } finally { await tx.$queryRaw`SELECT RELEASE_LOCK(${lockKey})` }
    }, { isolationLevel: 'Serializable', timeout: 10000 })
  },
  async mine(requester: AuthUser | null) { const user = requireAuth(requester); return prisma.appointment.findMany({ where: { customer: { userId: user.id } }, include: appointmentInclude, orderBy: { startsAt: 'desc' } }) },
  async salonAppointments(salonId: string, requester: AuthUser | null) { await requireSalonManager(salonId, requester); return prisma.appointment.findMany({ where: { salonId }, include: appointmentInclude, orderBy: { startsAt: 'desc' }, take: 200 }) },
  async updateStatus(id: string, rawStatus: unknown, reason: string | undefined, requester: AuthUser | null) {
    const user = requireAuth(requester); const status = z.enum(['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).parse(rawStatus); const appointment = await prisma.appointment.findUnique({ where: { id }, include: { customer: true, payment: true } }); if (!appointment) throw new GraphQLError('Marcação não encontrada', { extensions: { code: 'NOT_FOUND' } })
    const isCustomerCancellation = appointment.customer.userId === user.id && status === 'CANCELLED'; if (!isCustomerCancellation) await requireSalonManager(appointment.salonId, requester)
    if (!(transitions[appointment.status] as readonly string[]).includes(status)) throw new GraphQLError(`Transição ${appointment.status} → ${status} não permitida`, { extensions: { code: 'BAD_USER_INPUT' } })
    if (status === 'COMPLETED' && appointment.payment?.status === 'HELD') throw new GraphQLError('Confirme o serviço com o PIN ou QR Code do cliente para libertar o valor', { extensions: { code: 'BAD_USER_INPUT' } })
    if (status === 'CONFIRMED' && appointment.payment?.status !== 'HELD') throw new GraphQLError('A marcação só pode ser confirmada depois do pagamento M-Pesa', { extensions: { code: 'PAYMENT_REQUIRED' } })
    if (status === 'CANCELLED' && appointment.payment?.status === 'DISPUTED') throw new GraphQLError('Esta marcação possui uma disputa em análise', { extensions: { code: 'BAD_USER_INPUT' } })
    const paidAmount = Number(appointment.payment?.amount ?? 0); const transactionFee = Math.round(paidAmount * env.MOBILE_TRANSACTION_FEE_PERCENT) / 100; const refundAmount = paidAmount - transactionFee
    if (status === 'CANCELLED' && appointment.payment?.status === 'HELD') { const refund = await requestMpesaRefund({ amount: refundAmount, transactionId: appointment.payment.providerTransactionId ?? appointment.payment.reference, reference: appointment.payment.reference }); if (!refund.accepted) throw new GraphQLError('O M-Pesa não confirmou o reembolso parcial; a marcação não foi cancelada', { extensions: { code: 'REFUND_FAILED' } }) }
    return prisma.$transaction(async tx => { if (status === 'CANCELLED' && appointment.payment) { const paymentStatus = appointment.payment.status; const nextPaymentStatus = ['CREATED', 'PENDING'].includes(paymentStatus) ? 'CANCELLED' : paymentStatus === 'HELD' ? 'REFUNDED' : null; if (nextPaymentStatus) { const changed = await tx.payment.updateMany({ where: { id: appointment.payment.id, status: paymentStatus }, data: { status: nextPaymentStatus, refundedAt: nextPaymentStatus === 'REFUNDED' ? new Date() : undefined, refundAmount: nextPaymentStatus === 'REFUNDED' ? refundAmount : undefined, transactionFeeAmount: nextPaymentStatus === 'REFUNDED' ? transactionFee : undefined } }); if (!changed.count) throw new GraphQLError('O estado do pagamento mudou. Actualize e tente novamente.', { extensions: { code: 'PAYMENT_CONFLICT' } }); await tx.paymentEvent.create({ data: { paymentId: appointment.payment.id, fromStatus: paymentStatus as 'CREATED' | 'PENDING' | 'HELD', toStatus: nextPaymentStatus, source: 'CANCELLATION', detail: reason ?? (nextPaymentStatus === 'REFUNDED' ? `Marcação cancelada; ${refundAmount.toFixed(2)} MT reembolsados e ${transactionFee.toFixed(2)} MT retidos como taxa da carteira móvel (${env.MOBILE_TRANSACTION_FEE_PERCENT}%)` : 'Marcação cancelada antes da confirmação do pagamento') } }) } }; return tx.appointment.update({ where: { id }, data: { status, history: { create: { fromStatus: appointment.status, toStatus: status, changedById: user.id, reason } } }, include: appointmentInclude }) })
  },
}
