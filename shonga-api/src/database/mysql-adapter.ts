import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export function createMySqlAdapter(connectionString: string) {
  const url = new URL(connectionString)
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL deve utilizar o protocolo mysql://')
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 10,
  })
}
