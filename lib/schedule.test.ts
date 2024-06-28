import {describe, expect, test} from '@jest/globals'
import Schedule from './schedule'
import {Protocol} from './protocol'
import {MS_DAY, MS_MINUTE} from '@/utils/times'

function timesDescendBuffered(times: number[], minsep: number) {
  const n = times.length
  let pass = true
  for (let i = 1; i < n; i++) {
    if (times[i] - times[i - 1] < minsep) {
      pass = false
      break
    }
  }
  return pass
}
function timesAreValid(times: number[], start: number, end: number, protocol: Protocol) {
  const n = times.length
  expect(n).toEqual(protocol.beeps)
  expect(times[0]).toBeGreaterThanOrEqual(start)
  expect(times[n - 1]).toBeLessThanOrEqual(end)
  expect(timesDescendBuffered(times, (protocol.minsep || 0) * MS_MINUTE)).toBeTruthy()
}
describe('roll times works', function () {
  const protocol = {beeps: 7, minsep: 10, randomization: 'none'} as Protocol
  const start = Date.now()
  const end = start + MS_DAY
  const schedule = new Schedule()
  test('no randomization works', async () => {
    schedule.rollTimes(protocol, start, end)
    timesAreValid(schedule.times, start, end, protocol)
  })
  test('independent randomization works', async () => {
    protocol.randomization = 'independent'
    schedule.rollTimes(protocol, start, end)
    timesAreValid(schedule.times, start, end, protocol)
  })
  test('binned randomization works', async () => {
    protocol.randomization = 'binned'
    schedule.rollTimes(protocol, start, end)
    timesAreValid(schedule.times, start, end, protocol)
  })
})
