import { env } from '../config/env.js'

export type MpesaRequest = { amount: number; phone: string; reference: string }
export type MpesaResult = { accepted: boolean; transactionId?: string; code?: string; message: string; confirmed?: boolean }
export type MpesaRefundRequest = { amount: number; transactionId: string; reference: string }

export async function requestMpesaPayment(input: MpesaRequest): Promise<MpesaResult> {
  if (env.MPESA_MODE === 'mock') {
    return { accepted: true, confirmed: true, transactionId: `MOCK-${input.reference}`, code: 'INS-0', message: 'Pagamento M-Pesa simulado e confirmado' }
  }
  if (!env.MPESA_API_URL || !env.MPESA_API_KEY || !env.MPESA_SERVICE_PROVIDER_CODE) throw new Error('Integração M-Pesa não configurada')
  const response = await fetch(env.MPESA_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.MPESA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_TransactionReference: input.reference, input_CustomerMSISDN: input.phone, input_Amount: input.amount, input_ServiceProviderCode: env.MPESA_SERVICE_PROVIDER_CODE, input_ThirdPartyReference: input.reference }),
    signal: AbortSignal.timeout(15_000),
  })
  const payload = await response.json() as Record<string, unknown>
  const code = String(payload.output_ResponseCode ?? response.status)
  return { accepted: response.ok && code === 'INS-0', transactionId: payload.output_TransactionID ? String(payload.output_TransactionID) : undefined, code, message: String(payload.output_ResponseDesc ?? 'Pedido submetido ao M-Pesa') }
}

export async function requestMpesaRefund(input: MpesaRefundRequest): Promise<MpesaResult> {
  if (env.MPESA_MODE === 'mock') return { accepted: true, confirmed: true, transactionId: `REFUND-${input.reference}`, code: 'INS-0', message: 'Reembolso M-Pesa simulado e confirmado' }
  if (!env.MPESA_REFUND_URL || !env.MPESA_API_KEY || !env.MPESA_SERVICE_PROVIDER_CODE) throw new Error('Reembolso M-Pesa não configurado')
  const response = await fetch(env.MPESA_REFUND_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.MPESA_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input_TransactionID: input.transactionId, input_Amount: input.amount, input_ServiceProviderCode: env.MPESA_SERVICE_PROVIDER_CODE, input_ThirdPartyReference: input.reference }), signal: AbortSignal.timeout(15_000) })
  const payload = await response.json() as Record<string, unknown>; const code = String(payload.output_ResponseCode ?? response.status)
  return { accepted: response.ok && code === 'INS-0', transactionId: payload.output_TransactionID ? String(payload.output_TransactionID) : undefined, code, message: String(payload.output_ResponseDesc ?? 'Pedido de reembolso submetido') }
}
