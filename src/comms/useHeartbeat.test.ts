import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const { upsertSpy } = vi.hoisted(() => ({ upsertSpy: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./commsRepo', () => ({ upsertPresence: upsertSpy }))

import { useHeartbeat } from './useHeartbeat'

beforeEach(() => { vi.useFakeTimers(); upsertSpy.mockClear() })
afterEach(() => vi.useRealTimers())

const base = { id: 'd1', deviceId: 'd1', booth: 'drinks' as const, mode: 'order' as const }

test('writes presence immediately and then every 30s', () => {
  renderHook(() => useHeartbeat(base))
  expect(upsertSpy).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(30_000)
  expect(upsertSpy).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(30_000)
  expect(upsertSpy).toHaveBeenCalledTimes(3)
})

test('null presence does nothing', () => {
  renderHook(() => useHeartbeat(null))
  vi.advanceTimersByTime(60_000)
  expect(upsertSpy).not.toHaveBeenCalled()
})

test('stops on unmount', () => {
  const { unmount } = renderHook(() => useHeartbeat(base))
  expect(upsertSpy).toHaveBeenCalledTimes(1)
  unmount()
  vi.advanceTimersByTime(60_000)
  expect(upsertSpy).toHaveBeenCalledTimes(1)
})
