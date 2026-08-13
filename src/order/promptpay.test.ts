import { buildPromptPayPayload } from './promptpay'

// A stand-in id, not the deployment's real one — that lives in .env.
const ID = '0000000000'

test('produces an EMVCo payload string for an amount', () => {
  const payload = buildPromptPayPayload(ID, 35)
  expect(typeof payload).toBe('string')
  expect(payload.length).toBeGreaterThan(0)
  expect(payload.startsWith('00020101')).toBe(true) // EMVCo header
})

test('different amounts produce different payloads', () => {
  expect(buildPromptPayPayload(ID, 35)).not.toBe(buildPromptPayPayload(ID, 60))
})

test('same input is deterministic', () => {
  expect(buildPromptPayPayload(ID, 35)).toBe(buildPromptPayPayload(ID, 35))
})
