import { createHash, randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'
import type { AuthUser } from './auth.types.js'

const encoder = new TextEncoder()
const accessSecret = encoder.encode(env.JWT_ACCESS_SECRET)
const refreshSecret = encoder.encode(env.JWT_REFRESH_SECRET)

const durationToSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value)
  if (!match) throw new Error(`Duração JWT inválida: ${value}`)
  const units = { s: 1, m: 60, h: 3600, d: 86400 }
  return Number(match[1]) * units[match[2] as keyof typeof units]
}

const sign = (user: AuthUser, type: 'access' | 'refresh', seconds: number, secret: Uint8Array) =>
  new SignJWT({ email: user.email, roles: user.roles, type }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(user.id).setJti(randomUUID()).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + seconds).sign(secret)

export const tokenService = {
  accessLifetimeSeconds: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  refreshLifetimeSeconds: durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  signAccess(user: AuthUser) { return sign(user, 'access', this.accessLifetimeSeconds, accessSecret) },
  signRefresh(user: AuthUser) { return sign(user, 'refresh', this.refreshLifetimeSeconds, refreshSecret) },
  hash(token: string) { return createHash('sha256').update(token).digest('hex') },
  async verifyAccess(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.type !== 'access' || !payload.sub || typeof payload.email !== 'string' || !Array.isArray(payload.roles)) throw new Error('Token de acesso inválido')
    return { id: payload.sub, email: payload.email, roles: payload.roles.filter((role): role is string => typeof role === 'string') }
  },
  async verifyRefresh(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, refreshSecret)
    if (payload.type !== 'refresh' || !payload.sub) throw new Error('Refresh token inválido')
    return payload.sub
  },
}
