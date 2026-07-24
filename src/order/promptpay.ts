import generatePayload from 'promptpay-qr'

export function buildPromptPayPayload(promptpayId: string, amount: number): string {
  return generatePayload(promptpayId, { amount })
}
