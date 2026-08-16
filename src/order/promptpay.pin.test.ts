// Pins the *contents* of the PromptPay payload, not just its shape.
//
// Why a second file next to `promptpay.test.ts`: that file asserts the payload
// is a non-empty deterministic string starting with the EMVCo header. Those
// four assertions all survive a wrong amount — a doubled charge is still a
// distinct, deterministic, well-prefixed string. Verified by mutation on
// 2026-08-17: `{ amount: amount * 2 }` in `buildPromptPayPayload` kept all 131
// tests on main green. The amount is the one number the customer actually pays,
// so it gets pinned here.
//
// No new dependency: a PromptPay payload is EMVCo TLV (tag(2) + len(2) + value),
// which is short enough to decode inline.
import { buildPromptPayPayload } from './promptpay'

// A stand-in id, not the deployment's real one — that lives in .env.
const PHONE = '0812345678'

/** Split one level of EMVCo TLV into { tag: value }. */
function parseTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2)
    const len = Number(payload.slice(i + 2, i + 4))
    if (!Number.isFinite(len)) break
    out[tag] = payload.slice(i + 4, i + 4 + len)
    i += 4 + len
  }
  return out
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) — the checksum EMVCo tag 63 carries. */
function crc16(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

test('the amount the customer is charged is encoded in the payload (tag 54)', () => {
  expect(parseTlv(buildPromptPayPayload(PHONE, 35))['54']).toBe('35.00')
  expect(parseTlv(buildPromptPayPayload(PHONE, 60))['54']).toBe('60.00')
  // 45 is a real basket: 35 drink + 10 topping delta.
  expect(parseTlv(buildPromptPayPayload(PHONE, 45))['54']).toBe('45.00')
})

test('a non-integer amount keeps both decimal places', () => {
  expect(parseTlv(buildPromptPayPayload(PHONE, 35.5))['54']).toBe('35.50')
})

test('the payload charges Thai baht (tag 53 = 764) in Thailand (tag 58 = TH)', () => {
  const tlv = parseTlv(buildPromptPayPayload(PHONE, 35))
  expect(tlv['53']).toBe('764')
  expect(tlv['58']).toBe('TH')
})

test('the money is addressed to the given id, in international form (tag 29)', () => {
  const merchant = parseTlv(buildPromptPayPayload(PHONE, 35))['29']
  // 0812345678 -> 0066812345678: leading 0 replaced by the 66 country code.
  expect(merchant).toContain('0066812345678')
  expect(merchant).not.toContain(PHONE)
})

test('the amount is fixed, not left for the payer to type (tag 01 = 12, dynamic)', () => {
  expect(parseTlv(buildPromptPayPayload(PHONE, 35))['01']).toBe('12')
})

test('the payload carries a valid CRC, so a bank app will accept it', () => {
  const payload = buildPromptPayPayload(PHONE, 35)
  // The CRC covers everything up to and including its own tag+length ("6304").
  const body = payload.slice(0, -4)
  expect(payload.slice(-4)).toBe(crc16(body))
})

test('the CRC check has teeth: tampering with the amount invalidates it', () => {
  const payload = buildPromptPayPayload(PHONE, 35)
  // Tamper with whatever amount is actually encoded, so this stays a test of the
  // CRC rather than a second (noisier) test of the amount.
  const encoded = parseTlv(payload)['54']
  const tampered = payload.replace(encoded, '9'.repeat(encoded.length))
  expect(tampered).not.toBe(payload)
  expect(tampered.slice(-4)).not.toBe(crc16(tampered.slice(0, -4)))
})
