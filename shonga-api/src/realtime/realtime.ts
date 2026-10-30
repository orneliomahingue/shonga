import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { tokenService } from '../auth/token.service.js'
import { prisma } from '../database/prisma.js'

export type RealtimeEvent = { type: string; title: string; message: string; appointmentId?: string; paymentId?: string; salonId?: string; status?: string; createdAt: string }
let io: Server | null = null

export function startRealtime(server: HttpServer) {
  io = new Server(server, { path: '/realtime', cors: { origin: env.CORS_ORIGIN, credentials: true }, transports: ['websocket', 'polling'] })
  io.use(async (socket, next) => { try { const token = String(socket.handshake.auth?.token ?? ''); socket.data.user = await tokenService.verifyAccess(token); next() } catch { next(new Error('UNAUTHENTICATED')) } })
  io.on('connection', async socket => {
    const user = socket.data.user as { id: string; roles: string[] }
    socket.join(`user:${user.id}`)
    if (user.roles.includes('ADMIN')) socket.join('role:ADMIN')
    const salons = await prisma.salon.findMany({ where: { OR: [{ ownerId: user.id }, { employees: { some: { userId: user.id } } }] }, select: { id: true } })
    for (const salon of salons) socket.join(`salon:${salon.id}`)
    socket.emit('realtime:ready', { connectedAt: new Date().toISOString() })
  })
  return io
}

const payload = (event: Omit<RealtimeEvent, 'createdAt'>): RealtimeEvent => ({ ...event, createdAt: new Date().toISOString() })
export const realtime = {
  user(userId: string, event: Omit<RealtimeEvent, 'createdAt'>) { io?.to(`user:${userId}`).emit('notification', payload(event)) },
  salon(salonId: string, event: Omit<RealtimeEvent, 'createdAt'>) { io?.to(`salon:${salonId}`).emit('notification', payload(event)) },
  admins(event: Omit<RealtimeEvent, 'createdAt'>) { io?.to('role:ADMIN').emit('notification', payload(event)) },
  async appointment(appointmentId: string, event: Omit<RealtimeEvent, 'createdAt'>, audiences: Array<'customer' | 'salon' | 'admins'> = ['customer', 'salon']) { const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { salonId: true, customer: { select: { userId: true } } } }); if (!appointment) return; const full = { ...event, appointmentId, salonId: appointment.salonId }; if (audiences.includes('customer')) this.user(appointment.customer.userId, full); if (audiences.includes('salon')) this.salon(appointment.salonId, full); if (audiences.includes('admins')) this.admins(full) },
}
