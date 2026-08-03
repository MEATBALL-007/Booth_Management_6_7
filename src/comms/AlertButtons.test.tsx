import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { sendSpy } = vi.hoisted(() => ({ sendSpy: vi.fn().mockResolvedValue('m1') }))
vi.mock('./commsRepo', () => ({ sendMessage: sendSpy }))

import { AlertButtons } from './AlertButtons'

beforeEach(() => { localStorage.clear(); sendSpy.mockClear() })

test('preset button sends an alert with the preset code', async () => {
  const user = userEvent.setup()
  render(<AlertButtons booth="drinks" mode="order" />)
  await user.click(screen.getByRole('button', { name: /ขอคนช่วย/ }))
  expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'alert', presetCode: 'need_help', fromBooth: 'drinks', scope: 'all',
  }))
})

test('text send includes the typed text and clears the field', async () => {
  const user = userEvent.setup()
  render(<AlertButtons booth="photo" mode="order" />)
  const input = screen.getByLabelText(/ข้อความ/)
  await user.type(input, 'มาช่วยหน่อย')
  await user.click(screen.getByRole('button', { name: /^ส่ง/ }))
  expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'text', text: 'มาช่วยหน่อย' }))
  await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
})

test('shows an error if send is rejected', async () => {
  const user = userEvent.setup()
  sendSpy.mockRejectedValueOnce(new Error('nope'))
  render(<AlertButtons booth="drinks" mode="order" />)
  await user.click(screen.getByRole('button', { name: /ของใกล้หมด/ }))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
})
