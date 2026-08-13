import { isDashboardUnlocked, unlockDashboard, lockDashboard } from './pinStore'
import { APP_CONFIG } from '../domain/appConfig'

beforeEach(() => localStorage.clear())

test('starts locked', () => {
  expect(isDashboardUnlocked()).toBe(false)
})

test('wrong PIN does not unlock', () => {
  expect(unlockDashboard('0000')).toBe(false)
  expect(isDashboardUnlocked()).toBe(false)
})

test('the configured PIN unlocks and is remembered', () => {
  expect(unlockDashboard(APP_CONFIG.dashboardPin)).toBe(true)
  expect(isDashboardUnlocked()).toBe(true)
})

test('empty input never unlocks', () => {
  expect(unlockDashboard('')).toBe(false)
  expect(isDashboardUnlocked()).toBe(false)
})

test('lockDashboard re-locks', () => {
  unlockDashboard(APP_CONFIG.dashboardPin)
  lockDashboard()
  expect(isDashboardUnlocked()).toBe(false)
})
