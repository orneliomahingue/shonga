import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { prisma } from './database/prisma.js'
import { resolvers, typeDefs } from './graphql/schema.js'
import { createContext } from './auth/auth.context.js'

const app = express()
const apollo = new ApolloServer({ typeDefs, resolvers })
await apollo.start()

app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' }))
app.use('/graphql', cors({ origin: env.CORS_ORIGIN, credentials: true }), express.json({ limit: '1mb' }), expressMiddleware(apollo, { context: async ({ req }) => createContext(req) }))
app.get('/health', (_request, response) => response.json({ status: 'ok' }))

const httpServer = app.listen(env.PORT, () => console.log(`SHONGA API: http://localhost:${env.PORT}/graphql`))

const shutdown = async () => {
  httpServer.close()
  await apollo.stop()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
