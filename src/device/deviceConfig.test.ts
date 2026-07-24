import {
  saveDeviceConfig,
  loadDeviceConfig,
  clearDeviceConfig,
  isConfigValid,
} from './deviceConfig'

beforeEach(() => localStorage.clear())

test('save then load round-trips the config', () => {
  saveDeviceConfig({ booth: 'drinks', mode: 'order', station: 'A' })
  expect(loadDeviceConfig()).toEqual({ booth: 'drinks', mode: 'order', station: 'A' })
})

test('load returns null when nothing saved', () => {
  expect(loadDeviceConfig()).toBeNull()
})

test('clear removes the config', () => {
  saveDeviceConfig({ booth: 'photo', mode: 'display' })
  clearDeviceConfig()
  expect(loadDeviceConfig()).toBeNull()
})

test('order mode requires a station', () => {
  expect(isConfigValid({ booth: 'photo', mode: 'order' })).toBe(false)
  expect(isConfigValid({ booth: 'photo', mode: 'order', station: 'B' })).toBe(true)
  expect(isConfigValid({ booth: 'photo', mode: 'display' })).toBe(true)
})
