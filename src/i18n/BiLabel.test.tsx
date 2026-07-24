import { render, screen } from '@testing-library/react'
import { BiLabel } from './BiLabel'

test('BiLabel shows both Thai and English', () => {
  render(<BiLabel k="setup.chooseBooth" />)
  expect(screen.getByText('เลือกซุ้ม')).toBeInTheDocument()
  expect(screen.getByText('Choose booth')).toBeInTheDocument()
})
