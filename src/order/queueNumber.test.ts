import { formatQueueNumber, peekLastQueueNumber, nextQueueNumber } from './queueNumber'

beforeEach(() => localStorage.clear())

test('formatQueueNumber prefixes the station letter', () => {
  expect(formatQueueNumber('A', 7)).toBe('A7')
  expect(formatQueueNumber('B', 3)).toBe('B3')
})

test('nextQueueNumber increments from 0 and persists', () => {
  expect(nextQueueNumber('photo', 'A')).toBe('A1')
  expect(nextQueueNumber('photo', 'A')).toBe('A2')
  expect(peekLastQueueNumber('photo', 'A')).toBe(2)
})

test('counters are independent per booth and per station', () => {
  expect(nextQueueNumber('photo', 'A')).toBe('A1')
  expect(nextQueueNumber('photo', 'B')).toBe('B1')
  expect(nextQueueNumber('drinks', 'A')).toBe('A1')
})

test('peekLastQueueNumber does not mutate the counter', () => {
  nextQueueNumber('photo', 'A') // A1
  expect(peekLastQueueNumber('photo', 'A')).toBe(1)
  expect(peekLastQueueNumber('photo', 'A')).toBe(1)
})
