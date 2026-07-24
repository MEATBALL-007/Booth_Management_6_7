import { THEME } from './theme'

test('PHANTOM CREW palette is exact', () => {
  expect(THEME.orange).toBe('#FA4616')
  expect(THEME.yellow).toBe('#FFC72C')
  expect(THEME.bg).toBe('#1A1A1A')
})
