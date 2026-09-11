export type AuthUser = { id: string; email: string; roles: string[] }
export type RequestMetadata = { ipAddress?: string; userAgent?: string }
export type GraphQLContext = { authUser: AuthUser | null; requestMetadata: RequestMetadata }
