import { APP_CONFIG } from './appConfig'

test('app config holds the exact PromptPay id and dashboard PIN', () => {
  expect(APP_CONFIG.promptpayId).toBe('REDACTED-PROMPTPAY-ID')
  expect(APP_CONFIG.dashboardPin).toBe('REDACTED-PIN')
})
