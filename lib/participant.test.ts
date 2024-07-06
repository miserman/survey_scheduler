import {describe, expect, test} from '@jest/globals'
import Participant from './participant'
import {Protocol} from './protocol'

describe('roll protocol works', function () {
  const protocol = new Protocol({days: 1})
  const protocols = {a: protocol, b: protocol, c: protocol}
  const p = new Participant({
    id: '123',
    start_day: '2024-02-05',
    start_time: '08:00',
    end_day: '2024-02-14',
    end_time: '17:00',
  })

  test('ordered works', async () => {
    p.order_type = 'ordered'
    p.rollProtocols(protocols)
    expect(p.protocol_order).toStrictEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'])
  })
  test('sample works', async () => {
    p.order_type = 'sample'
    p.rollProtocols(protocols)
    expect(p.protocol_order.length).toStrictEqual(9)
  })
  test('shuffle works', async () => {
    p.order_type = 'shuffle'
    p.rollProtocols(protocols)
    expect(p.protocol_order.sort()).toStrictEqual(['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c'])
  })
})

describe('schedule day works', function () {
  const protocols = {
    a: {beeps: 7, minsep: 10, randomization: 'none'} as Protocol,
    b: {beeps: 3, minsep: 10, randomization: 'independent'} as Protocol,
  }
  const p = new Participant({
    id: '123',
    start_day: '2024-02-05',
    start_time: '08:00',
    end_day: '2024-02-11',
    end_time: '17:00',
  })
  p.rollSchedule(protocols)
  test('no randomization works', async () => {
    expect(p.schedule.length).toEqual(p.n_days)
  })
})
