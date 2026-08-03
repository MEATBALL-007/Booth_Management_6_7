import { THEME } from './theme'

test('PHANTOM CREW palette is exact', () => {
  expect(THEME.orange).toBe('#FA4616')
  expect(THEME.yellow).toBe('#FFC72C')
  expect(THEME.bg).toBe('#0a0a0c')
})

test('THEME includes the Neon Clarity neutral palette', () => {
  expect(THEME.bg).toBe('#0a0a0c')
  expect(THEME.surface).toBe('#151517')
  expect(THEME.surface2).toBe('#1c1c20')
  expect(THEME.muted).toBe('#9a9aa2')
  expect(THEME.success).toBe('#3ad35a')
})
