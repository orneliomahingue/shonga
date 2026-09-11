import { GraphQLError } from 'graphql'
import { z } from 'zod'
import type { AuthUser } from '../auth/auth.types.js'
import { prisma } from '../database/prisma.js'
import { requireSalonManager } from '../salons/salon-access.js'

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/
const hoursSchema = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(timePattern), endTime: z.string().regex(timePattern) })).max(28)
const timeOffSchema = z.object({ employeeId: z.string().uuid(), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), type: z.enum(['VACATION', 'ABSENCE', 'BLOCKED']), reason: z.string().trim().max(250).optional() })
const availabilitySchema = z.object({ employeeId: z.string().uuid(), serviceId: z.string().uuid(), date: z.iso.date(), stepMin: z.number().int().min(5).max(120).default(30) })
const blockingStatuses = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'] as const

const toMinute = (time: string) => { const [hour = '0', minute = '0'] = time.split(':'); return Number(hour) * 60 + Number(minute) }
const toTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const maputoDate = (date: string, minute: number) => new Date(`${date}T${toTime(minute)}:00+02:00`)
const overlaps = (start: Date, end: Date, block: { startsAt: Date; endsAt: Date }) => start < block.endsAt && end > block.startsAt

async function getEmployee(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { salon: true } })
  if (!employee) throw new GraphQLError('Especialista não encontrado', { extensions: { code: 'NOT_FOUND' } })
  return employee
}

export const schedulesService = {
  async get(employeeId: string, requester: AuthUser | null) { const employee = await getEmployee(employeeId); await requireSalonManager(employee.salonId, requester); const [workingHours, timeOff] = await Promise.all([prisma.workingHour.findMany({ where: { employeeId, active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] }), prisma.employeeTimeOff.findMany({ where: { employeeId, endsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } })]); return { workingHours, timeOff } },
  async setWorkingHours(employeeId: string, rawHours: unknown, requester: AuthUser | null) {
    const employee = await getEmployee(employeeId); await requireSalonManager(employee.salonId, requester); const hours = hoursSchema.parse(rawHours).map((item) => ({ ...item, startMinute: toMinute(item.startTime), endMinute: toMinute(item.endTime) }))
    for (const hour of hours) if (hour.startMinute >= hour.endMinute) throw new GraphQLError('O fim do horário deve ser posterior ao início', { extensions: { code: 'BAD_USER_INPUT' } })
    for (const day of new Set(hours.map(({ dayOfWeek }) => dayOfWeek))) { const periods = hours.filter((item) => item.dayOfWeek === day).sort((a, b) => a.startMinute - b.startMinute); if (periods.some((period, index) => index > 0 && period.startMinute < periods[index - 1]!.endMinute)) throw new GraphQLError('Existem horários sobrepostos no mesmo dia', { extensions: { code: 'BAD_USER_INPUT' } }) }
    await prisma.$transaction([prisma.workingHour.deleteMany({ where: { employeeId } }), prisma.workingHour.createMany({ data: hours.map(({ dayOfWeek, startMinute, endMinute }) => ({ employeeId, dayOfWeek, startMinute, endMinute })) })])
    return prisma.workingHour.findMany({ where: { employeeId }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] })
  },
  async addTimeOff(rawInput: unknown, requester: AuthUser | null) { const input = timeOffSchema.parse(rawInput); const employee = await getEmployee(input.employeeId); await requireSalonManager(employee.salonId, requester); const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt); if (startsAt >= endsAt) throw new GraphQLError('O fim da indisponibilidade deve ser posterior ao início', { extensions: { code: 'BAD_USER_INPUT' } }); return prisma.employeeTimeOff.create({ data: { employeeId: input.employeeId, startsAt, endsAt, type: input.type, reason: input.reason } }) },
  async removeTimeOff(id: string, requester: AuthUser | null) { const record = await prisma.employeeTimeOff.findUnique({ where: { id }, include: { employee: true } }); if (!record) throw new GraphQLError('Indisponibilidade não encontrada', { extensions: { code: 'NOT_FOUND' } }); await requireSalonManager(record.employee.salonId, requester); await prisma.employeeTimeOff.delete({ where: { id } }); return true },
  async availableSlots(rawInput: unknown) {
    const input = availabilitySchema.parse(rawInput); const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, status: 'ACTIVE', salon: { status: 'APPROVED' }, services: { some: { serviceId: input.serviceId } } } }); if (!employee) throw new GraphQLError('Especialista indisponível para este serviço', { extensions: { code: 'BAD_USER_INPUT' } })
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, salonId: employee.salonId, status: 'ACTIVE' } }); if (!service) throw new GraphQLError('Serviço indisponível', { extensions: { code: 'BAD_USER_INPUT' } })
    const dayOfWeek = new Date(`${input.date}T12:00:00Z`).getUTCDay(); const dayStart = maputoDate(input.date, 0), dayEnd = maputoDate(input.date, 1440)
    const [hours, timeOff, appointments] = await Promise.all([prisma.workingHour.findMany({ where: { employeeId: employee.id, dayOfWeek, active: true }, orderBy: { startMinute: 'asc' } }), prisma.employeeTimeOff.findMany({ where: { employeeId: employee.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }), prisma.appointment.findMany({ where: { employeeId: employee.id, status: { in: [...blockingStatuses] }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } })])
    const blocked = [...timeOff, ...appointments]; const now = new Date(); const slots = new Map<string, { startsAt: string; endsAt: string; label: string }>()
    for (const period of hours) for (let minute = period.startMinute; minute + service.durationMin <= period.endMinute; minute += input.stepMin) { const start = maputoDate(input.date, minute), end = maputoDate(input.date, minute + service.durationMin); if (start > now && !blocked.some((block) => overlaps(start, end, block))) slots.set(start.toISOString(), { startsAt: start.toISOString(), endsAt: end.toISOString(), label: toTime(minute) }) }
    return [...slots.values()]
  },
}

export const scheduleMappers = { time: toTime }
