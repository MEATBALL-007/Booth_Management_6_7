import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => localStorage.clear())

test('shows Setup when no device config', () => {
  render(<App />)
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})

test('after setup, shows the chosen mode placeholder and can reset', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  expect(screen.getByText(/โหมด: display/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /เปลี่ยนค่า/ }))
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})
