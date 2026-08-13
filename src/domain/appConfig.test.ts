import { APP_CONFIG } from './appConfig'

// The real values are not in source any more, so this pins the wiring rather
// than the secrets: config must come from the environment, and the test fakes
// set in src/test/setup.ts are what should arrive here.
test('app config is read from the environment, not hard-coded', () => {
  expect(APP_CONFIG.promptpayId).toBe(import.meta.env.VITE_PROMPTPAY_ID)
  expect(APP_CONFIG.dashboardPin).toBe(import.meta.env.VITE_DASHBOARD_PIN)
})

test('config values are present in the test environment', () => {
  expect(APP_CONFIG.promptpayId).not.toBe('')
  expect(APP_CONFIG.dashboardPin).not.toBe('')
})
