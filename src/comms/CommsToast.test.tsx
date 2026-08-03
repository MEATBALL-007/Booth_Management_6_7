import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import type { Message } from './types'

const { ackSpy } = vi.hoisted(() => ({ ackSpy: vi.fn().mockResolvedValue(undefined) }))
let emit: (m: Message[]) => void = () => {}
vi.mock('./commsRepo', () => ({
  subscribeMessages: (cb: (m: Message[]) => void) => { emit = cb; return () => {} },
  ackMessage: ackSpy,
}))
vi.mock('../device/deviceId', () => ({ getDeviceId: () => 'me' }))

import { CommsToast } from './CommsToast'

const m = (over: Partial<Message>): Message => ({
  id: 'x', fromDeviceId: 'other', fromBooth: 'photo', fromMode: 'order',
  scope: 'all', kind: 'alert', presetCode: 'need_help', createdAt: 1, ackBy: [], ...over,
})

beforeEach(() => { localStorage.clear(); ackSpy.mockClear() })

test('shows a visible alert and acking it calls ackMessage', async () => {
  const user = userEvent.setup()
  render(<CommsToast booth="drinks" />)
  act(() => emit([m({ id: 'a', presetCode: 'need_help' })]))
  expect(screen.getByText(/ขอคนช่วย/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /รับทราบ/ }))
  expect(ackSpy).toHaveBeenCalledWith('a', 'me')
})

test('renders nothing when there is no visible message (my own message)', () => {
  render(<CommsToast booth="drinks" />)
  act(() => emit([m({ id: 'b', fromDeviceId: 'me' })]))
  expect(screen.queryByRole('button', { name: /รับทราบ/ })).not.toBeInTheDocument()
})
