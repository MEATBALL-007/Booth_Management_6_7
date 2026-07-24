import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('./chime', () => ({ playChime: playChimeSpy }))

import { useServingAlert } from './useServingAlert'

beforeEach(() => {
  vi.useFakeTimers()
  playChimeSpy.mockClear()
})
afterEach(() => vi.useRealTimers())

test('mount is baseline: no chime, not flashing', () => {
  const { result } = renderHook(({ nums }) => useServingAlert(nums), { initialProps: { nums: ['A1'] } })
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(result.current).toBe(false)
})

test('a newly-serving number chimes and flashes, then stops after 2.5s', () => {
  const { result, rerender } = renderHook(({ nums }) => useServingAlert(nums), { initialProps: { nums: ['A1'] } })
  rerender({ nums: ['A1', 'A2'] })
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(result.current).toBe(true)
  act(() => vi.advanceTimersByTime(2500))
  expect(result.current).toBe(false)
})

test('no change means no chime', () => {
  const { result, rerender } = renderHook(({ nums }) => useServingAlert(nums), { initialProps: { nums: ['A1'] } })
  rerender({ nums: ['A1'] })
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(result.current).toBe(false)
})

test('flash still clears on schedule if an unrelated change (no new number) lands mid-flash', () => {
  const { result, rerender } = renderHook(({ nums }) => useServingAlert(nums), { initialProps: { nums: ['A1'] } })
  rerender({ nums: ['A1', 'A2'] })          // A2 newly serving → flashing
  expect(result.current).toBe(true)
  act(() => vi.advanceTimersByTime(1000))    // partway through the flash
  rerender({ nums: ['A2'] })                 // A1 completed/removed — NO new number
  expect(result.current).toBe(true)          // still flashing (not reset, not stuck-cleared)
  act(() => vi.advanceTimersByTime(1500))     // reach original 2500ms
  expect(result.current).toBe(false)         // flash ended on its original schedule
})
