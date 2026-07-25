import { isDashboardUnlocked, unlockDashboard, lockDashboard } from './pinStore'

beforeEach(() => localStorage.clear())

test('starts locked', () => {
  expect(isDashboardUnlocked()).toBe(false)
})

test('wrong PIN does not unlock', () => {
  expect(unlockDashboard('0000')).toBe(false)
  expect(isDashboardUnlocked()).toBe(false)
})

test('correct PIN REDACTED-PIN unlocks and is remembered', () => {
  expect(unlockDashboard('REDACTED-PIN')).toBe(true)
  expect(isDashboardUnlocked()).toBe(true)
})

test('lockDashboard re-locks', () => {
  unlockDashboard('REDACTED-PIN')
  lockDashboard()
  expect(isDashboardUnlocked()).toBe(false)
})
