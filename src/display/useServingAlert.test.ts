import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('./chime', () => ({ playChime: playChimeSpy }))
import { useServingAlert } from './useServingAlert'

beforeEach(() => { vi.useFakeTimers(); playChimeSpy.mockClear() })
afterEach(() => vi.useRealTimers())

const sig = (n: string, a = 0) => ({ n, announcedAt: a })

test('mount is baseline: no chime', () => {
  const { result } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(result.current).toBe(false)
})

test('a new serving number chimes + flashes then clears', () => {
  const { result, rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 1), sig('A2', 2)] })
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(result.current).toBe(true)
  act(() => vi.advanceTimersByTime(2500))
  expect(result.current).toBe(false)
})

test('a bumped announcedAt on the same number re-announces', () => {
  const { rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 5)] })
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})

test('no change means no chime', () => {
  const { rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 1)] })
  expect(playChimeSpy).not.toHaveBeenCalled()
})

test('flash still clears on schedule if an unrelated change lands mid-flash (no stuck flash)', () => {
  const { result, rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 1), sig('A2', 2)] })   // A2 new -> flashing
  expect(result.current).toBe(true)
  act(() => vi.advanceTimersByTime(1000))          // partway through the flash
  rerender({ s: [sig('A2', 2)] })                  // A1 removed — no new number, no bumped announcedAt
  expect(result.current).toBe(true)                // still flashing (timer not cancelled)
  act(() => vi.advanceTimersByTime(1500))           // reach original 2500ms
  expect(result.current).toBe(false)               // cleared on original schedule
})
