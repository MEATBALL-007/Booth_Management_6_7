import { isOnline, visibleMessages } from './commsLogic'
import type { Message, Presence } from './types'

const p = (over: Partial<Presence>): Presence => ({
  id: 'd1', deviceId: 'd1', booth: 'drinks', mode: 'order', lastSeen: 0, ...over,
})
const m = (over: Partial<Message>): Message => ({
  id: 'x', fromDeviceId: 'other', fromBooth: 'photo', fromMode: 'order',
  scope: 'all', kind: 'alert', presetCode: 'need_help', createdAt: 1, ackBy: [], ...over,
})

test('isOnline uses the 90s threshold by default', () => {
  expect(isOnline(p({ lastSeen: 1_000_000 }), 1_000_000 + 89_000)).toBe(true)
  expect(isOnline(p({ lastSeen: 1_000_000 }), 1_000_000 + 91_000)).toBe(false)
})

test('visibleMessages excludes my own messages and ones I acked', () => {
  const list = [
    m({ id: 'a', fromDeviceId: 'me' }),            // mine → hidden
    m({ id: 'b', ackBy: ['me'] }),                 // acked by me → hidden
    m({ id: 'c' }),                                // visible
  ]
  expect(visibleMessages(list, 'drinks', 'me').map((x) => x.id)).toEqual(['c'])
})

test('visibleMessages respects scope (all or my booth) and sorts newest first', () => {
  const list = [
    m({ id: 'all1', scope: 'all', createdAt: 1 }),
    m({ id: 'mine', scope: 'drinks', createdAt: 3 }),
    m({ id: 'other', scope: 'photo', createdAt: 2 }), // not my booth → hidden
  ]
  expect(visibleMessages(list, 'drinks', 'me').map((x) => x.id)).toEqual(['mine', 'all1'])
})
