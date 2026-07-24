import { vi, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') },
}))

import { QrCode } from './QrCode'

test('renders a QR image for the payload', async () => {
  render(<QrCode payload="00020101TEST" />)
  await waitFor(() => {
    const img = screen.getByAltText('PromptPay QR') as HTMLImageElement
    expect(img.src).toBe('data:image/png;base64,FAKE')
  })
})
