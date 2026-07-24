import { BOOTH_IDS, MODES, STATIONS } from './types'

test('domain enums match the spec', () => {
  expect(BOOTH_IDS).toEqual(['photo', 'portrait', 'drinks'])
  expect(MODES).toEqual(['order', 'display', 'dashboard'])
  expect(STATIONS).toEqual(['A', 'B', 'C'])
})
