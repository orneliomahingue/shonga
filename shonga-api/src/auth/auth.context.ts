import type { Request } from 'express'
import type { GraphQLContext } from './auth.types.js'
import { tokenService } from './token.service.js'

export async function createContext(request: Request): Promise<GraphQLContext> {
  const header = request.headers.authorization
  let authUser = null
  if (header?.startsWith('Bearer ')) {
    try { authUser = await tokenService.verifyAccess(header.slice(7)) } catch { authUser = null }
  }
  return { authUser, requestMetadata: { ipAddress: request.ip, userAgent: request.headers['user-agent'] } }
}
