import { PrismaClient } from '../generated/prisma/client.js'
import { env } from '../config/env.js'
import { createMySqlAdapter } from './mysql-adapter.js'

const adapter = createMySqlAdapter(env.DATABASE_URL)
export const prisma = new PrismaClient({ adapter })
