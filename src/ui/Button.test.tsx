import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, test, expect } from 'vitest'
import { Button } from './Button'

test('renders children and forwards click + testid + aria-label', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(<Button data-testid="pay" aria-label="รับเงินแล้ว" onClick={onClick}>รับเงินแล้ว</Button>)
  const btn = screen.getByTestId('pay')
  expect(btn).toHaveTextContent('รับเงินแล้ว')
  expect(btn).toHaveAttribute('aria-label', 'รับเงินแล้ว')
  await user.click(btn)
  expect(onClick).toHaveBeenCalled()
})

test('disabled is forwarded', () => {
  render(<Button disabled>x</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
