import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinGate } from './PinGate'
import { APP_CONFIG } from '../domain/appConfig'

beforeEach(() => localStorage.clear())

test('wrong PIN shows an error and does not unlock', async () => {
  const user = userEvent.setup()
  const onUnlock = vi.fn()
  render(<PinGate onUnlock={onUnlock} />)
  await user.type(screen.getByLabelText(/ใส่ PIN/), '0000')
  await user.click(screen.getByRole('button', { name: /ปลดล็อก/ }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(onUnlock).not.toHaveBeenCalled()
})

test('correct PIN calls onUnlock', async () => {
  const user = userEvent.setup()
  const onUnlock = vi.fn()
  render(<PinGate onUnlock={onUnlock} />)
  await user.type(screen.getByLabelText(/ใส่ PIN/), APP_CONFIG.dashboardPin)
  await user.click(screen.getByRole('button', { name: /ปลดล็อก/ }))
  expect(onUnlock).toHaveBeenCalled()
})
