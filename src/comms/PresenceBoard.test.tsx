import { vi, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Presence } from './types'

let emit: (p: Presence[]) => void = () => {}
vi.mock('./commsRepo', () => ({ subscribePresence: (cb: (p: Presence[]) => void) => { emit = cb; return () => {} } }))

import { PresenceBoard } from './PresenceBoard'

test('lists devices with an online/offline status', () => {
  render(<PresenceBoard />)
  act(() => emit([
    { id: 'd1', deviceId: 'd1', booth: 'drinks', mode: 'order', station: 'A', lastSeen: Date.now() },
    { id: 'd2', deviceId: 'd2', booth: 'photo', mode: 'display', lastSeen: Date.now() - 200_000 },
  ]))
  const rows = screen.getAllByTestId('presence-row')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent(/ออนไลน์/)
  expect(rows[1]).toHaveTextContent(/หลุด/)
})
