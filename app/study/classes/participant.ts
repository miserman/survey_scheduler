import {MS_DAY, MS_HOUR, MS_MINUTE, Protocols, TIMEZONE_OFFSET, former, timeToMs} from '../root'
import type {Blackout, ParticipantSpec, Protocol} from '../types'
import Schedule from './schedule'

type DayParsed = {day: string; day_ms: number; time: string; time_ms: number}

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
  end: DayParsed = {
    day: '',
    day_ms: 0,
    time: '',
    time_ms: 0,
  }
  start: DayParsed = {
    day: '',
    day_ms: 0,
    time: '',
    time_ms: 0,
  }

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

  constructor(spec: ParticipantSpec) {
    Object.keys(spec).forEach(k => {
      const value = spec[k as keyof ParticipantSpec]
      if ('undefined' !== typeof value) (this[k as keyof ParticipantSpec] as typeof value) = value
    })
    this.updateDate(spec.start.day, 'start')
    this.updateDate(spec.end.day, 'end')
    this.updateTime(spec.start.time, 'start')
    this.updateTime(spec.end.time, 'end')
    if (!this.timezone) this.timezone = TIMEZONE_OFFSET / MS_MINUTE
  }
  updateDate(newDay: string | number, which: 'start' | 'end') {
    if ('number' === typeof newDay) newDay = former.dashdate(newDay)
    this[which].day = newDay
    this[which].day_ms = new Date(newDay + 'T12:00:00').getTime()
    if (this.end.day_ms && this.start.day_ms) {
      this.n_days = Math.floor((this.end.day_ms - this.start.day_ms) / MS_DAY) + 1
    }
  }
  updateTime(newTime: string | number, which: 'start' | 'end') {
    if ('number' === typeof newTime) newTime = former.time.format(newTime)
    this[which].time = newTime
    this[which].time_ms = timeToMs(newTime)
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
    let start = date + this.start.time_ms
    const schedule = new Schedule({date: start, protocol: protocolName})
    start += (new Date(start).getTimezoneOffset() - this.timezone) * MS_HOUR
    let end = date + this.end.time_ms
    end += (new Date(end).getTimezoneOffset() - this.timezone) * MS_HOUR
    schedule.rollTimes(protocol, start, end)
    if ('number' === typeof index) this.schedule[index] = schedule
    return schedule
  }
  addDay(protocols: Protocols) {
    this.updateDate(this.end.day_ms + MS_DAY, 'end')
    const last = this.schedule.length
    this.rollProtocols(protocols, last)
    this.scheduleDay(this.end.day_ms, protocols[this.protocol_order[last]], last)
  }
  rollSchedule(protocols: Protocols) {
    this.rollProtocols(protocols)
    const start = this.start.day_ms
    for (let i = 0; i < this.n_days; i++) {
      this.scheduleDay(start + i * MS_DAY, protocols[this.protocol_order[i]], i)
    }
  }
}
