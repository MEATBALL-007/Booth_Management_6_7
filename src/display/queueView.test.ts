import { servingOrders, upNextOrders, newlyServing } from './queueView'
import type { Order } from '../domain/types'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

test('servingOrders keeps only serving orders', () => {
  const list = [o({ id: 's', status: 'serving' }), o({ id: 'w', status: 'waiting' }), o({ id: 'd', status: 'done' })]
  expect(servingOrders(list).map((x) => x.id)).toEqual(['s'])
})

test('upNextOrders keeps waiting, sorted by createdAt ascending', () => {
  const list = [
    o({ id: 'a', status: 'waiting', queueNumber: 'A2', createdAt: 2 }),
    o({ id: 'b', status: 'waiting', queueNumber: 'B1', createdAt: 1 }),
    o({ id: 's', status: 'serving', createdAt: 0 }),
  ]
  expect(upNextOrders(list).map((x) => x.queueNumber)).toEqual(['B1', 'A2'])
})

test('newlyServing returns numbers present in next but not prev', () => {
  expect(newlyServing(['A1'], ['A1', 'A2'])).toEqual(['A2'])
  expect(newlyServing(['A1'], ['A1'])).toEqual([])
  expect(newlyServing([], ['A1'])).toEqual(['A1'])
})
