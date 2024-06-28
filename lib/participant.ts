import {MS_DAY, MS_HOUR, MS_MINUTE, TIMEZONE_OFFSET, dashdate, format_time, timeToMs} from '@/utils/times'
import type {Blackout} from './blackout'
import type {Protocol, Protocols} from './protocol'
import Schedule from './schedule'

type DayEntered = {day: string; time: string}
type DayParsed = {day: number; time: number}

function getProtocolDays(protocolDays: number, scheduleDays: number, nProtocols: number) {
  const days = !protocolDays
    ? Math.floor(scheduleDays / nProtocols)
    : protocolDays < 1
    ? Math.floor(scheduleDays * protocolDays)
    : protocolDays
  return Math.max(days, 1)
}
function byRandom() {
  return Math.random() - 0.5
}

export default class Participant {
  // always specified
  id = ''
  end: DayEntered = {day: '', time: ''}
  start: DayEntered = {day: '', time: ''}

  // valid defaults
  protocols: string[] = []
  blackouts: Blackout[] = []
  daysofweek = [true, true, true, true, true, true, true]
  order_type: 'shuffle' | 'sample' | 'ordered' = 'shuffle'
  phone = 0

  // always filled
  schedule: Schedule[] = []
  protocol_order: string[] = []
  first = 0
  last = 0
  n_days = 1
  timezone = 0
  end_ms: DayParsed = {day: 0, time: 0}
  start_ms: DayParsed = {day: 0, time: 0}

  constructor(participant: Partial<Participant>) {
    const spec = Object(participant)
    Object.keys(spec).forEach(k => {
      const value = spec[k as keyof Participant]
      if ('undefined' !== typeof value) (this[k as keyof Participant] as typeof value) = value
    })
    this.updateDate(spec.start.day, 'start')
    this.updateDate(spec.end.day, 'end')
    this.updateTime(spec.start.time, 'start')
    this.updateTime(spec.end.time, 'end')
    if (!this.timezone) this.timezone = TIMEZONE_OFFSET / MS_MINUTE
  }
  updateDate(newDay: string | number, which: 'start' | 'end') {
    if ('number' === typeof newDay) newDay = dashdate(newDay)
    this[which].day = newDay
    this[`${which}_ms`].day = new Date(newDay + 'T12:00:00').getTime()
    if (this.end_ms.day && this.start_ms.day) {
      this.n_days = Math.floor((this.end_ms.day - this.start_ms.day) / MS_DAY) + 1
    }
  }
  updateTime(newTime: string | number, which: 'start' | 'end') {
    if ('number' === typeof newTime) newTime = format_time(newTime)
    this[which].time = newTime
    this[`${which}_ms`].time = timeToMs(newTime)
  }
  rollProtocols(protocols: Protocols, start = 0) {
    if (!this.protocols.length) this.protocols = Object.keys(protocols)
    this.protocol_order.splice(start, this.protocol_order.length - start - 1)
    const n_protocols = this.protocols.length
    let days = start
    let i = 0
    switch (this.order_type) {
      case 'shuffle':
        const shuffled = [...this.protocols].sort(byRandom)
        i = n_protocols
        while (days < this.n_days) {
          const selected = shuffled[--i]
          const protocolDays = getProtocolDays(protocols[selected].days, this.n_days, n_protocols)
          const nAdded = this.protocol_order.length
          for (let assignDay = Math.min(protocolDays, this.n_days - nAdded); assignDay--; )
            this.protocol_order.push(selected)
          days += protocolDays
          if (!i) {
            i = n_protocols
            shuffled.sort(byRandom)
          }
        }
        break
      case 'ordered':
        while (days < this.n_days) {
          const selected = this.protocols[i]
          const protocolDays = getProtocolDays(protocols[selected].days, this.n_days, n_protocols)
          const nAdded = this.protocol_order.length
          for (let assignDay = Math.min(protocolDays, this.n_days - nAdded); assignDay--; )
            this.protocol_order.push(selected)
          days += protocolDays
          if (++i === n_protocols) i = 0
        }
        break
      default:
        while (days < this.n_days) {
          const selected = this.protocols[Math.min(n_protocols - 1, Math.floor(Math.random() * n_protocols))]
          const protocolDays = getProtocolDays(protocols[selected].days, this.n_days, n_protocols)
          const nAdded = this.protocol_order.length
          for (let assignDay = Math.min(protocolDays, this.n_days - nAdded); assignDay--; )
            this.protocol_order.push(selected)
          days += protocolDays
        }
    }
  }
  scheduleDay(date: number, protocol: Protocol, index?: number) {
    if ('undefined' === typeof index) index = this.schedule.length
    const protocolName = protocol.name || ''
    this.protocol_order[index] = protocolName
    let start = date + this.start_ms.time
    const schedule = new Schedule({date: start, protocol: protocolName})
    start += (new Date(start).getTimezoneOffset() - this.timezone) * MS_HOUR
    let end = date + this.end_ms.time
    end += (new Date(end).getTimezoneOffset() - this.timezone) * MS_HOUR
    schedule.rollTimes(protocol, start, end)
    if ('number' === typeof index) this.schedule[index] = schedule
    return schedule
  }
  addDay(protocols: Protocols) {
    this.updateDate(this.end_ms.day + MS_DAY, 'end')
    const last = this.schedule.length
    this.rollProtocols(protocols, last)
    this.scheduleDay(this.end_ms.day, protocols[this.protocol_order[last]], last)
  }
  rollSchedule(protocols: Protocols) {
    this.rollProtocols(protocols)
    const start = this.start_ms.day
    for (let i = 0; i < this.n_days; i++) {
      this.scheduleDay(start + i * MS_DAY, protocols[this.protocol_order[i]], i)
    }
  }
}
