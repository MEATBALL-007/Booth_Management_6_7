import { getDeviceId } from './deviceId'

beforeEach(() => localStorage.clear())

test('returns a non-empty id', () => {
  expect(getDeviceId().length).toBeGreaterThan(0)
})

test('is stable across calls and persists in localStorage', () => {
  const first = getDeviceId()
  expect(getDeviceId()).toBe(first)
  expect(localStorage.getItem('phantom.deviceId')).toBe(first)
})
