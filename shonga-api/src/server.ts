import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createServer } from 'node:http'
import { env } from './config/env.js'
import { prisma } from './database/prisma.js'
import { resolvers, typeDefs } from './graphql/schema.js'
import { createContext } from './auth/auth.context.js'
import { paymentsService } from './payments/payments.service.js'
import { realtime, startRealtime } from './realtime/realtime.js'

const app = express()
const apollo = new ApolloServer({ typeDefs, resolvers })
await apollo.start()

app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' }))
app.use('/graphql', cors({ origin: env.CORS_ORIGIN, credentials: true }), express.json({ limit: '1mb' }), expressMiddleware(apollo, { context: async ({ req }) => createContext(req) }))
app.post('/webhooks/mpesa', express.json({ limit: '64kb' }), async (request, response) => {
  if (!env.MPESA_CALLBACK_SECRET || request.header('x-callback-secret') !== env.MPESA_CALLBACK_SECRET) return response.status(401).json({ error: 'unauthorized' })
  const payment = await paymentsService.handleCallback(request.body as Record<string, unknown>)
  if (payment?.appointmentId && ['HELD', 'FAILED'].includes(payment.status)) void realtime.appointment(payment.appointmentId, { type: payment.status === 'HELD' ? 'PAYMENT_HELD' : 'PAYMENT_FAILED', title: payment.status === 'HELD' ? 'Pagamento confirmado' : 'Pagamento não concluído', message: payment.status === 'HELD' ? 'O valor está protegido até à confirmação do serviço.' : 'O pedido M-Pesa não foi confirmado.', paymentId: payment.id, status: payment.status })
  return response.status(204).end()
})
app.get('/health', (_request, response) => response.json({ status: 'ok' }))

const httpServer = createServer(app)
startRealtime(httpServer)
httpServer.listen(env.PORT, () => console.log(`SHONGA API: http://localhost:${env.PORT}/graphql`))

const shutdown = async () => {
  httpServer.close()
  await apollo.stop()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
