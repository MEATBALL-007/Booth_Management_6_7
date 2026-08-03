import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { Panel } from './Panel'
import { Chip } from './Chip'
import { StatTile } from './StatTile'
import { QueueNumber } from './QueueNumber'

test('Panel renders children and forwards data-testid', () => {
  render(<Panel data-testid="p">hi</Panel>)
  expect(screen.getByTestId('p')).toHaveTextContent('hi')
})

test('StatTile puts the testid on the value and shows label + value', () => {
  render(<StatTile testid="net-donation" label="ยอดบริจาคสุทธิ" value="1,240฿" accent />)
  expect(screen.getByTestId('net-donation')).toHaveTextContent('1,240฿')
  expect(screen.getByText('ยอดบริจาคสุทธิ')).toBeInTheDocument()
})

test('Chip renders its content', () => {
  render(<Chip tone="paid">✓ จ่ายแล้ว</Chip>)
  expect(screen.getByText('✓ จ่ายแล้ว')).toBeInTheDocument()
})

test('QueueNumber renders the value', () => {
  render(<QueueNumber value="A7" />)
  expect(screen.getByText('A7')).toBeInTheDocument()
})
