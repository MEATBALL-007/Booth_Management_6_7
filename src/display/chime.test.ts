import { vi, test, expect } from 'vitest'
import { playChime } from './chime'

test('playChime wires and starts/stops an oscillator on the given context', () => {
  const start = vi.fn()
  const stop = vi.fn()
  const connect = vi.fn()
  const osc = { type: '', frequency: { value: 0 }, connect, start, stop }
  const gain = { gain: { value: 0 }, connect }
  const ctx = {
    createOscillator: () => osc,
    createGain: () => gain,
    destination: {},
    currentTime: 0,
  } as unknown as AudioContext

  playChime(() => ctx)

  expect(osc.frequency.value).toBe(880)
  expect(connect).toHaveBeenCalled()
  expect(start).toHaveBeenCalled()
  expect(stop).toHaveBeenCalledWith(0.25)
})
