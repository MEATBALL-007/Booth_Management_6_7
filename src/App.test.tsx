import { render, screen } from '@testing-library/react'
import App from './App'

test('App renders the project name', () => {
  render(<App />)
  expect(screen.getByText(/สายสัมพันธ์/)).toBeInTheDocument()
})
