import { GraphQLError } from 'graphql'
import { z } from 'zod'
import { requireAuth } from '../auth/auth.guard.js'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'

const bookingSchema = z.object({ serviceId: z.string().uuid(), employeeId: z.string().uuid(), startsAt: z.iso.datetime({ offset: true }), notes: z.string().trim().max(1000).optional() })
const activeStatuses = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'] as const
const appointmentInclude = { salon: true, service: true, employee: { include: { user: true } }, customer: { include: { user: true } }, history: { orderBy: { createdAt: 'asc' as const } } } as const
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
    const user = requireAuth(requester); const status = z.enum(['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).parse(rawStatus); const appointment = await prisma.appointment.findUnique({ where: { id }, include: { customer: true } }); if (!appointment) throw new GraphQLError('Marcação não encontrada', { extensions: { code: 'NOT_FOUND' } })
    const isCustomerCancellation = appointment.customer.userId === user.id && status === 'CANCELLED'; if (!isCustomerCancellation) await requireSalonManager(appointment.salonId, requester)
    if (!(transitions[appointment.status] as readonly string[]).includes(status)) throw new GraphQLError(`Transição ${appointment.status} → ${status} não permitida`, { extensions: { code: 'BAD_USER_INPUT' } })
    return prisma.appointment.update({ where: { id }, data: { status, history: { create: { fromStatus: appointment.status, toStatus: status, changedById: user.id, reason } } }, include: appointmentInclude })
  },
}
