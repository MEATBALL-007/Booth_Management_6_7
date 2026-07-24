import { buildPromptPayPayload } from './promptpay'

test('produces an EMVCo payload string for an amount', () => {
  const payload = buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)
  expect(typeof payload).toBe('string')
  expect(payload.length).toBeGreaterThan(0)
  expect(payload.startsWith('00020101')).toBe(true) // EMVCo header
})

test('different amounts produce different payloads', () => {
  expect(buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)).not.toBe(
    buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 60),
  )
})

test('same input is deterministic', () => {
  expect(buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)).toBe(
    buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35),
  )
})
