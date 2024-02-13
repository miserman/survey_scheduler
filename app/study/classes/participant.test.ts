import {describe, expect, test} from '@jest/globals'
import {Protocol} from '../types'
import Participant from './participant'

describe('roll protocol works', function () {
  const protocols = {a: {days: 1}, b: {days: 1}, c: {days: 1}}
  const p = new Participant({
    id: '123',
    start: {day: '2024-02-05', time: '08:00'},
    end: {day: '2024-02-14', time: '17:00'},
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
    start: {day: '2024-02-05', time: '08:00'},
    end: {day: '2024-02-11', time: '17:00'},
  })
  p.rollSchedule(protocols)
  test('no randomization works', async () => {
    expect(p.schedule.length).toEqual(p.n_days)
  })
})
