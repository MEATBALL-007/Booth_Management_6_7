import { L } from './labels'

test('L returns a th/en pair', () => {
  expect(L('setup.chooseBooth')).toEqual({
    th: 'เลือกซุ้ม',
    en: 'Choose booth',
  })
})
