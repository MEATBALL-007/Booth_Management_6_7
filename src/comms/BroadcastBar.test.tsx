import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { sendSpy } = vi.hoisted(() => ({ sendSpy: vi.fn().mockResolvedValue('m1') }))
vi.mock('./commsRepo', () => ({ sendMessage: sendSpy }))
vi.mock('../device/deviceId', () => ({ getDeviceId: () => 'hq1' }))

import { BroadcastBar } from './BroadcastBar'

beforeEach(() => sendSpy.mockClear())

test('sends a broadcast message and clears the input', async () => {
  const user = userEvent.setup()
  render(<BroadcastBar booth="photo" />)
  const input = screen.getByLabelText(/ประกาศถึงทุกซุ้ม/)
  await user.type(input, 'อีก 30 นาทีปิดงาน')
  await user.click(screen.getByRole('button', { name: /^ส่ง/ }))
  expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'broadcast', scope: 'all', text: 'อีก 30 นาทีปิดงาน', fromDeviceId: 'hq1',
  }))
  await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
})
