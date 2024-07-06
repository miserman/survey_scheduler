import {MS_DAY, MS_HOUR, MS_MINUTE, MS_WEEK, TIMEZONE_OFFSET, dashdate, format_time, timeToMs} from '@/utils/times'
import type {Blackout} from './blackout'
import type {Protocol, Protocols} from './protocol'
import Schedule from './schedule'

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

const scheduledBeeps = new Map<string, NodeJS.Timeout>()

export default class Participant {
  // always specified
  id = ''
  start_day = ''
  start_time = ''
  end_day = ''
  end_time = ''

  // valid defaults
  protocols: string[] = []
  blackouts: Blackout[] = []
  daysofweek = [true, true, true, true, true, true, true]
  order_type: 'shuffle' | 'sample' | 'ordered' = 'shuffle'
  phone = ''

  // always filled
  schedule: Schedule[] = []
  protocol_order: string[] = []
  first = 0
  last = 0
  n_days = 1
  timezone = 0
  end_ms: DayParsed = {day: 0, time: 0}
  start_ms: DayParsed = {day: 0, time: 0}
  study = ''

  // environment-based
  messager = (day: Schedule, index: number) => {}
  logger = (message: string) => {}

  constructor(
    participant?: Partial<Participant>,
    messager?: (day: Schedule, index: number) => void,
    logger?: (messager: string) => void
  ) {
    const spec = Object(participant || {})
    Object.keys(spec).forEach(k => {
      const value = spec[k as keyof Participant]
      if ('undefined' !== typeof value) (this[k as keyof Participant] as typeof value) = value
    })
    this.phone += ''
    this.updateDate(spec.start_day, 'start')
    this.updateTime(spec.start_time, 'start')
    this.updateDate(spec.end_day, 'end')
    this.updateTime(spec.end_time, 'end')
    if (!this.timezone) this.timezone = TIMEZONE_OFFSET / MS_MINUTE
    if (messager) this.messager = messager
    if (logger) this.logger = logger
  }
  updateDate(newDay: string | number, which: 'start' | 'end') {
    if ('number' === typeof newDay) newDay = dashdate(newDay)
    if (!newDay) newDay = dashdate(Date.now())
    this[`${which}_day`] = newDay
    this[`${which}_ms`].day = new Date(newDay + 'T12:00:00').getTime()
    if (this.end_ms.day && this.start_ms.day) {
      this.n_days = Math.floor((this.end_ms.day - this.start_ms.day) / MS_DAY) + 1
    }
  }
  updateTime(newTime: string | number, which: 'start' | 'end') {
    if ('number' === typeof newTime) newTime = format_time(newTime)
    if (!newTime) newTime = format_time(Date.now())
    this[`${which}_time`] = newTime
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
  checkBeep(day: number, index: number) {
    const now = Date.now()
    let status: 'ineligible' | 'standard' | 'paused' | 'late' = 'ineligible'
    if (day > -1 && this.schedule.length < day) {
      const daySchedule = this.schedule[index]
      if (index > -1 && daySchedule.times.length < index) {
        const time = daySchedule.times[index]
        const priorStatus = daySchedule.statuses[index]
        if ((priorStatus === 1 || priorStatus === 6) && time > now - MS_MINUTE * 15 && time < now + MS_WEEK) {
          status = time > now ? (priorStatus === 1 ? 'standard' : 'paused') : 'late'
        }
      }
    }
    return status
  }
  sendBeep(day: number, index: number) {
    const status = this.checkBeep(day, index)
    if (status !== 'ineligible') {
      this.messager(this.schedule[day], index)
    }
  }
  establish() {
    const now = Date.now()
    this.schedule.forEach((daySchedule, day) => {
      daySchedule.times.forEach((time, index) => {
        const status = this.checkBeep(day, index)
        if (status === 'standard' || status === 'paused') {
          scheduledBeeps.set(
            this.study + this.id + day + index,
            setTimeout(() => {
              this.sendBeep(day, index)
            }, time - now)
          )
        }
      })
    })
  }
}
export type Participants = {[index: string]: Participant}

export class ParticipantSummary {
  upcoming = 0
  orders: {[index: string]: number} = {}
  protocols: {[index: string]: number} = {}
  first = {earliest: Infinity, latest: -Infinity}
  last = {earliest: Infinity, latest: -Infinity}
}
