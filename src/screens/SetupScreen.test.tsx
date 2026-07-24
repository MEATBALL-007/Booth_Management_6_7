import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupScreen } from './SetupScreen'
import { loadDeviceConfig } from '../device/deviceConfig'

beforeEach(() => localStorage.clear())

test('confirm is disabled until a valid choice is made', async () => {
  const user = userEvent.setup()
  render(<SetupScreen onDone={() => {}} />)

  const confirm = screen.getByRole('button', { name: /ยืนยัน/ })
  expect(confirm).toBeDisabled()

  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  expect(confirm).toBeEnabled()
})

test('confirming an order station saves booth+mode+station and calls onDone', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<SetupScreen onDone={onDone} />)

  await user.click(screen.getByRole('button', { name: /โฟโต้บูธ/ }))
  await user.click(screen.getByRole('button', { name: /รับออเดอร์/ }))
  await user.click(screen.getByRole('button', { name: /^A$/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  expect(loadDeviceConfig()).toEqual({ booth: 'photo', mode: 'order', station: 'A' })
  expect(onDone).toHaveBeenCalled()
})
