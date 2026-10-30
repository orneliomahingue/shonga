import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireAuth, requireRoles } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'
import { requestMpesaPayment, requestMpesaRefund } from './mpesa.gateway.js'
import { realtime } from '../realtime/realtime.js'

const include = { events: { orderBy: { createdAt: 'asc' as const } } } as const
const phoneSchema = z.string().trim().regex(/^(?:\+?258)?8[234567]\d{7}$/, 'Número móvel moçambicano inválido')
const secret = env.PAYMENT_SECRET ?? env.JWT_ACCESS_SECRET
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const proofFor = (appointmentId: string, kind: 'pin' | 'qr') => createHmac('sha256', secret).update(`${kind}:${appointmentId}`).digest(kind === 'pin' ? 'hex' : 'base64url')
const pinFor = (appointmentId: string) => String(parseInt(proofFor(appointmentId, 'pin').slice(0, 10), 16) % 1_000_000).padStart(6, '0')
const qrFor = (appointmentId: string) => proofFor(appointmentId, 'qr')
const safeEqual = (left: string, right: string) => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b) }
const reference = () => `SNG${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().slice(0, 6).toUpperCase()}`

async function expireIfNeeded<T extends { id: string; status: string; expiresAt: Date }>(payment: T): Promise<T> {
  if (['CREATED', 'PENDING'].includes(payment.status) && payment.expiresAt <= new Date()) {
    return prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED', events: { create: { fromStatus: payment.status as 'CREATED' | 'PENDING', toStatus: 'EXPIRED', source: 'SYSTEM', detail: 'Tempo limite do pedido M-Pesa excedido' } } }, include }) as unknown as T
  }
  return payment
}

export const paymentsService = {
  async start(appointmentId: string, rawPhone: unknown, requester: AuthUser | null) {
    const user = requireAuth(requester); const phone = phoneSchema.parse(rawPhone).replace(/^258/, '').replace(/^\+258/, '')
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true, payment: true } })
    if (!appointment) throw new GraphQLError('Marcação não encontrada', { extensions: { code: 'NOT_FOUND' } })
    if (appointment.customer.userId !== user.id) throw new GraphQLError('Sem acesso a esta marcação', { extensions: { code: 'FORBIDDEN' } })
    if (!['PENDING', 'AWAITING_PAYMENT'].includes(appointment.status)) throw new GraphQLError('Esta marcação já não aceita pagamento', { extensions: { code: 'BAD_USER_INPUT' } })
    if (appointment.payment && ['PENDING', 'HELD', 'RELEASED', 'DISPUTED'].includes(appointment.payment.status)) return expireIfNeeded(await prisma.payment.findUniqueOrThrow({ where: { id: appointment.payment.id }, include }))
    const amount = Number(appointment.total); const commissionAmount = Math.round(amount * env.MARKETPLACE_COMMISSION_PERCENT) / 100
    const payment = await prisma.$transaction(async tx => {
      if (appointment.payment) await tx.payment.delete({ where: { id: appointment.payment.id } })
      await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'AWAITING_PAYMENT', history: { create: { fromStatus: appointment.status, toStatus: 'AWAITING_PAYMENT', changedById: user.id, reason: 'Pagamento M-Pesa iniciado' } } } })
      return tx.payment.create({ data: { reference: reference(), appointmentId, salonId: appointment.salonId, phone, amount, commissionAmount, salonAmount: amount - commissionAmount, status: 'CREATED', expiresAt: new Date(Date.now() + 5 * 60_000), events: { create: { toStatus: 'CREATED', source: 'CUSTOMER' } } }, include })
    })
    try {
      const result = await requestMpesaPayment({ amount, phone, reference: payment.reference })
      const nextStatus = result.accepted ? (result.confirmed ? 'HELD' : 'PENDING') : 'FAILED'
      const completed = await prisma.$transaction(async tx => {
        const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: nextStatus, providerTransactionId: result.transactionId, providerCode: result.code, providerMessage: result.message, paidAt: nextStatus === 'HELD' ? new Date() : undefined, events: { create: { fromStatus: 'CREATED', toStatus: nextStatus, source: 'MPESA', detail: result.message } } }, include })
        if (nextStatus === 'HELD') { await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'CONFIRMED', history: { create: { fromStatus: 'AWAITING_PAYMENT', toStatus: 'CONFIRMED', changedById: user.id, reason: 'Pagamento M-Pesa confirmado e retido' } } } }); await tx.serviceConfirmation.create({ data: { appointmentId, pinHash: digest(pinFor(appointmentId)), qrTokenHash: digest(qrFor(appointmentId)), expiresAt: new Date(appointment.endsAt.getTime() + 24 * 60 * 60_000) } }) }
        return updated
      }); void realtime.appointment(appointmentId, { type: nextStatus === 'HELD' ? 'PAYMENT_HELD' : nextStatus === 'PENDING' ? 'PAYMENT_PENDING' : 'PAYMENT_FAILED', title: nextStatus === 'HELD' ? 'Pagamento confirmado' : nextStatus === 'PENDING' ? 'Pedido M-Pesa enviado' : 'Pagamento não concluído', message: result.message, paymentId: payment.id, status: nextStatus }); return completed
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', providerMessage: error instanceof Error ? error.message : 'Falha M-Pesa', events: { create: { fromStatus: 'CREATED', toStatus: 'FAILED', source: 'SYSTEM', detail: error instanceof Error ? error.message : undefined } } } })
      throw new GraphQLError('Não foi possível iniciar o pagamento M-Pesa. Tente novamente.', { extensions: { code: 'PAYMENT_FAILED' } })
    }
  },
  async byAppointment(appointmentId: string, requester: AuthUser | null) {
    const user = requireAuth(requester); const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true } }); if (!appointment) return null
    if (appointment.customer.userId !== user.id) await requireSalonManager(appointment.salonId, requester)
    const payment = await prisma.payment.findUnique({ where: { appointmentId }, include }); return payment ? expireIfNeeded(payment) : null
  },
  async credentials(appointmentId: string, requester: AuthUser | null) {
    const user = requireAuth(requester); const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true, payment: true, confirmation: true } })
    if (!appointment || appointment.customer.userId !== user.id) throw new GraphQLError('Confirmação não encontrada', { extensions: { code: 'NOT_FOUND' } })
    if (appointment.payment?.status !== 'HELD' || !appointment.confirmation) throw new GraphQLError('O pagamento ainda não está confirmado', { extensions: { code: 'BAD_USER_INPUT' } })
    return { pin: pinFor(appointmentId), qrPayload: `shonga://service/confirm?appointment=${appointmentId}&token=${qrFor(appointmentId)}`, expiresAt: appointment.confirmation.expiresAt }
  },
  async confirmService(appointmentId: string, proof: string, requester: AuthUser | null) {
    const user = requireAuth(requester); const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true, payment: true, confirmation: true } })
    if (!appointment?.payment || !appointment.confirmation) throw new GraphQLError('Confirmação não encontrada', { extensions: { code: 'NOT_FOUND' } })
    const isCustomer = appointment.customer.userId === user.id
    if (!isCustomer) await requireSalonManager(appointment.salonId, requester)
    if (appointment.payment.status !== 'HELD') throw new GraphQLError('O valor não está em retenção', { extensions: { code: 'BAD_USER_INPUT' } })
    if (appointment.status !== 'IN_PROGRESS') throw new GraphQLError('O salão deve fazer o check-in antes da confirmação do serviço', { extensions: { code: 'BAD_USER_INPUT' } })
    if (appointment.confirmation.confirmedAt) throw new GraphQLError('Serviço já confirmado', { extensions: { code: 'BAD_USER_INPUT' } })
    if (appointment.confirmation.expiresAt <= new Date()) throw new GraphQLError('PIN/QR Code expirado', { extensions: { code: 'BAD_USER_INPUT' } })
    const token = proof.includes('token=') ? new URL(proof).searchParams.get('token') ?? '' : proof.trim()
    const valid = safeEqual(digest(token), appointment.confirmation.qrTokenHash) || safeEqual(digest(token), appointment.confirmation.pinHash)
    if (!valid) { await prisma.serviceConfirmation.update({ where: { appointmentId }, data: { failedAttempts: { increment: 1 } } }); throw new GraphQLError('PIN ou QR Code inválido', { extensions: { code: 'BAD_USER_INPUT' } }) }
    const completed = await prisma.$transaction(async tx => {
      await tx.serviceConfirmation.update({ where: { appointmentId }, data: { confirmedAt: new Date(), confirmedById: user.id } })
      const payment = await tx.payment.update({ where: { appointmentId }, data: { status: 'RELEASED', releasedAt: new Date(), events: { create: { fromStatus: 'HELD', toStatus: 'RELEASED', source: isCustomer ? 'CUSTOMER' : 'SALON', detail: 'Serviço confirmado por PIN/QR Code' } } }, include })
      await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'COMPLETED', history: { create: { fromStatus: appointment.status, toStatus: 'COMPLETED', changedById: user.id, reason: 'Serviço confirmado; valor libertado ao salão' } } } })
      return payment
    }); void realtime.appointment(appointmentId, { type: 'SERVICE_COMPLETED', title: 'Serviço concluído', message: 'O serviço foi confirmado e o valor libertado ao salão.', paymentId: completed.id, status: 'RELEASED' }); return completed
  },
  async dispute(appointmentId: string, reason: string, requester: AuthUser | null) {
    const user = requireAuth(requester); const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true, payment: true } })
    if (!appointment?.payment || appointment.customer.userId !== user.id) throw new GraphQLError('Pagamento não encontrado', { extensions: { code: 'NOT_FOUND' } })
    if (appointment.payment.status !== 'HELD') throw new GraphQLError('Apenas valores retidos podem entrar em disputa', { extensions: { code: 'BAD_USER_INPUT' } })
    const disputed = await prisma.payment.update({ where: { id: appointment.payment.id }, data: { status: 'DISPUTED', events: { create: { fromStatus: 'HELD', toStatus: 'DISPUTED', source: 'CUSTOMER', detail: z.string().trim().min(10).max(1000).parse(reason) } } }, include }); void realtime.appointment(appointmentId, { type: 'DISPUTE_OPENED', title: 'Nova disputa de pagamento', message: 'O valor permanece retido até à análise do marketplace.', paymentId: disputed.id, status: 'DISPUTED' }, ['customer', 'salon', 'admins']); return disputed
  },
  async disputes(requester: AuthUser | null) {
    requireRoles(requester, ['ADMIN'])
    const payments = await prisma.payment.findMany({ where: { status: 'DISPUTED' }, include: { events: { orderBy: { createdAt: 'asc' } }, appointment: { include: { service: true, salon: true, customer: { include: { user: true } } } } }, orderBy: { updatedAt: 'asc' } })
    return payments.map(payment => { const opened = [...payment.events].reverse().find(event => event.toStatus === 'DISPUTED'); return { payment, serviceName: payment.appointment.service.name, salonName: payment.appointment.salon.name, customerName: `${payment.appointment.customer.user.firstName} ${payment.appointment.customer.user.lastName}`, appointmentStatus: payment.appointment.status, reason: opened?.detail ?? '', openedAt: opened?.createdAt ?? payment.updatedAt } })
  },
  async resolveDispute(paymentId: string, decisionRaw: unknown, reasonRaw: unknown, requester: AuthUser | null) {
    const admin = requireRoles(requester, ['ADMIN']); const decision = z.enum(['REFUND_CUSTOMER', 'RELEASE_SALON']).parse(decisionRaw); const reason = z.string().trim().min(10).max(1000).parse(reasonRaw)
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { appointment: true } }); if (!payment || payment.status !== 'DISPUTED') throw new GraphQLError('Disputa aberta não encontrada', { extensions: { code: 'NOT_FOUND' } })
    const paidAmount = Number(payment.amount); const transactionFee = Math.round(paidAmount * env.MOBILE_TRANSACTION_FEE_PERCENT) / 100; const refundAmount = paidAmount - transactionFee
    if (decision === 'REFUND_CUSTOMER') { const refund = await requestMpesaRefund({ amount: refundAmount, transactionId: payment.providerTransactionId ?? payment.reference, reference: payment.reference }); if (!refund.accepted) throw new GraphQLError('O M-Pesa não confirmou o reembolso parcial', { extensions: { code: 'REFUND_FAILED' } }) }
    const nextStatus = decision === 'REFUND_CUSTOMER' ? 'REFUNDED' : 'RELEASED'; const appointmentStatus = decision === 'REFUND_CUSTOMER' ? 'CANCELLED' : 'COMPLETED'; const now = new Date()
    const resolved = await prisma.$transaction(async tx => { const detail = decision === 'REFUND_CUSTOMER' ? `${reason} Reembolso: ${refundAmount.toFixed(2)} MT; taxa móvel não reembolsável: ${transactionFee.toFixed(2)} MT (${env.MOBILE_TRANSACTION_FEE_PERCENT}%).` : reason; const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: nextStatus, refundedAt: decision === 'REFUND_CUSTOMER' ? now : undefined, refundAmount: decision === 'REFUND_CUSTOMER' ? refundAmount : undefined, transactionFeeAmount: decision === 'REFUND_CUSTOMER' ? transactionFee : undefined, releasedAt: decision === 'RELEASE_SALON' ? now : undefined, events: { create: { fromStatus: 'DISPUTED', toStatus: nextStatus, source: 'ADMIN', detail } } }, include }); await tx.appointment.update({ where: { id: payment.appointmentId }, data: { status: appointmentStatus, history: { create: { fromStatus: payment.appointment.status, toStatus: appointmentStatus, changedById: admin.id, reason: `Resolução de disputa: ${detail}` } } } }); return updated }); void realtime.appointment(payment.appointmentId, { type: decision === 'REFUND_CUSTOMER' ? 'PAYMENT_REFUNDED' : 'PAYMENT_RELEASED', title: 'Disputa resolvida', message: decision === 'REFUND_CUSTOMER' ? `${refundAmount.toFixed(2)} MT foram reembolsados ao cliente.` : 'O valor foi libertado ao salão.', paymentId: payment.id, status: nextStatus }); return resolved
  },
  async handleCallback(body: Record<string, unknown>) {
    const referenceValue = String(body.reference ?? body.input_ThirdPartyReference ?? ''); const success = String(body.code ?? body.output_ResponseCode ?? '') === 'INS-0'
    const payment = await prisma.payment.findUnique({ where: { reference: referenceValue }, include: { appointment: true } }); if (!payment || !['CREATED', 'PENDING'].includes(payment.status)) return payment
    const next = success ? 'HELD' : 'FAILED'
    return prisma.$transaction(async tx => { const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: payment.status }, data: { status: next, providerTransactionId: body.transactionId ? String(body.transactionId) : undefined, providerCode: String(body.code ?? ''), providerMessage: String(body.message ?? ''), paidAt: success ? new Date() : undefined } }); if (!claimed.count) return tx.payment.findUnique({ where: { id: payment.id } }); await tx.paymentEvent.create({ data: { paymentId: payment.id, fromStatus: payment.status as 'CREATED' | 'PENDING', toStatus: next, source: 'MPESA_CALLBACK' } }); if (success) { await tx.appointment.updateMany({ where: { id: payment.appointmentId, status: 'AWAITING_PAYMENT' }, data: { status: 'CONFIRMED' } }); await tx.serviceConfirmation.upsert({ where: { appointmentId: payment.appointmentId }, update: {}, create: { appointmentId: payment.appointmentId, pinHash: digest(pinFor(payment.appointmentId)), qrTokenHash: digest(qrFor(payment.appointmentId)), expiresAt: new Date(payment.appointment.endsAt.getTime() + 86400000) } }) }; return tx.payment.findUnique({ where: { id: payment.id } }) })
  },
}
