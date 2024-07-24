import {MS_DAY, MS_HOUR, MS_MINUTE, MS_WEEK, TIMEZONE_OFFSET, dashdate, format_time, timeToMs} from '@/utils/times'
import {Blackout} from './blackout'
import type {Protocol, Protocols} from './protocol'
import Schedule from './schedule'
import useStore from '@/app/store'

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

type MessagePayload = {Message: string; PhoneNumber: string}
export type ParticipantHooks = {
  messager: (payload: MessagePayload) => Promise<string>
  logger: (study: string, message: string) => void
  updater: (study: string, id: string, participant: Participant) => Promise<string>
}

export default class Participant {
  // always specified
  id = ''
  start_day = ''
  end_day = ''

  // valid defaults
  start_time = '09:00'
  end_time = '17:00'
  protocols: string[] = []
  blackouts: Blackout[] = []
  daysofweek = [true, true, true, true, true, true, true]
  order_type: 'shuffle' | 'sample' | 'ordered' = 'shuffle'
  phone = ''

  // always filled when new
  schedule: Schedule[] = []
  protocol_order: string[] = []
  first = Infinity
  last = -Infinity
  n_days = 1
  timezone = 0
  end_ms: DayParsed = {day: 0, time: 0}
  start_ms: DayParsed = {day: 0, time: 0}
  study = ''

  // environment-based
  env: ParticipantHooks = {
    messager: async (payload: MessagePayload) => {
      return 'no messager attached'
    },
    logger: (study: string, message: string) => {},
    updater: async (study: string, id: string, participant: Participant) => {
      return 'no updater attached'
    },
  }

  scheduleTimeouts: Map<string, NodeJS.Timeout>

  constructor(participant?: Partial<Participant>, env?: ParticipantHooks) {
    const spec = Object(participant)
    Object.keys(spec).forEach(k => {
      if (k === 'blackouts') {
        this.blackouts = spec[k].map((b: Partial<Blackout>) => new Blackout(b))
      } else if (k === 'schedule') {
        this.schedule = spec[k].map((s: Partial<Schedule>) => new Schedule(s))
      } else {
        const value = spec[k as keyof Participant]
        if ('undefined' !== typeof value)
          (this[k as keyof Participant] as typeof value) = Array.isArray(value) ? [...value] : value
      }
    })
    this.id += ''
    this.phone += ''
    this.updateDate(spec.start_day, 'start')
    this.updateTime(spec.start_time || this.start_time, 'start')
    this.updateDate(spec.end_day, 'end')
    this.updateTime(spec.end_time || this.end_time, 'end')
    this.scheduleRange()
    if (!this.timezone) this.timezone = TIMEZONE_OFFSET / MS_MINUTE
    if (env) this.env = env
    this.scheduleTimeouts = new Map()
  }
  updateDate(newDay: string | number, which: 'start' | 'end') {
    if ('number' === typeof newDay) newDay = dashdate(newDay)
    if (!newDay) newDay = dashdate(which === 'start' ? Date.now() : Date.now() + 7 * MS_DAY)
    this[`${which}_day`] = newDay
    this[`${which}_ms`].day = new Date(newDay + (which === 'start' ? 'T00:00:01' : 'T23:59:59')).getTime()
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
    if (!n_protocols) return
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
  scheduleDay(date: number, protocol?: Protocol, index?: number) {
    if (!protocol) return
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
  validDay(date: number) {
    const parsed = new Date(date)
    if (!this.daysofweek[parsed.getDay()]) return false
    let pass = true
    this.blackouts.forEach(b => {
      if (pass) {
        if (date > new Date(b.start).setHours(0, 0, 0, 0) && date < new Date(b.end).setHours(24, 0, 0, 0)) pass = false
      }
    })
    return pass
  }
  scheduleRange() {
    this.first = Infinity
    this.last = -Infinity
    this.schedule.forEach(s => {
      const first = s.times[0]
      const last = s.times[s.times.length - 1]
      if (first < this.first) this.first = first
      if (last > this.last) this.last = last
    })
    return [this.first, this.last]
  }
  rollSchedule(protocols: Protocols) {
    this.schedule = []
    this.rollProtocols(protocols)
    const start = this.start_ms.day
    for (let i = 0; i < this.n_days; i++) {
      const date = start + i * MS_DAY
      if (this.validDay(date)) {
        this.scheduleDay(date, protocols[this.protocol_order[i]], i)
      }
    }
  }
  checkBeep(day: number, index: number) {
    const now = Date.now()
    let status: 'ineligible' | 'missed' | 'standard' | 'paused' | 'skipped' | 'late' = 'ineligible'
    if (day > -1 && this.schedule.length > day) {
      const daySchedule = this.schedule[day]
      if (index > -1 && daySchedule.times.length > index) {
        const time = daySchedule.times[index]
        const priorStatus = daySchedule.statuses[index]
        if (priorStatus === 1 || priorStatus === 6) {
          if (time > now - MS_MINUTE * 15 && time < now + MS_WEEK) {
            status = time > now ? (priorStatus === 1 ? 'standard' : 'paused') : 'late'
          } else {
            status = priorStatus === 1 ? 'missed' : 'skipped'
          }
        }
      }
    }
    return status
  }
  sendBeep(day: number, index: number) {
    const {studies} = useStore()
    const {protocols} = studies[this.study]
    this.sendMessage(protocols, day, index)
  }
  establish() {
    const now = Date.now()
    this.schedule.forEach((daySchedule, day) => {
      daySchedule.times.forEach((time, index) => {
        const status = this.checkBeep(day, index)
        const beepId = '' + day + index
        if (this.scheduleTimeouts.has(beepId)) clearTimeout(this.scheduleTimeouts.get(beepId))
        if (status === 'standard' || status === 'paused') {
          this.scheduleTimeouts.set(
            beepId,
            setTimeout(() => this.sendBeep(day, index), time - now)
          )
        } else if (status === 'late') {
          this.sendBeep(day, index)
        } else if (status === 'missed' || status === 'skipped') {
          daySchedule.statuses[index] = status === 'missed' ? 0 : 7
          this.env.updater(this.study, this.id, this.export())
        }
      })
    })
  }
  check() {
    this.schedule.forEach((daySchedule, day) => {
      daySchedule.times.forEach((_, index) => {
        const status = this.checkBeep(day, index)
        if (status === 'late') {
          const beepId = '' + day + index
          if (this.scheduleTimeouts.has(beepId)) clearTimeout(this.scheduleTimeouts.get(beepId))
          this.sendBeep(day, index)
        }
      })
    })
  }
  cancel() {
    this.scheduleTimeouts.forEach(id => clearTimeout(id))
  }
  async sendMessage(protocols: Protocols, dayIndex: number, beepIndex: number) {
    const beepId = this.id + ' [' + dayIndex + '][' + beepIndex + ']'
    const daySchedule = this.schedule[dayIndex]
    const protocol = protocols[daySchedule.protocol]

    const status = this.checkBeep(dayIndex, beepIndex)
    let newStatus = 0
    switch (status) {
      case 'ineligible':
        this.env.logger(this.study, 'not sending beep ' + beepId + ' because it has an ineligible status')
        return
      case 'paused':
        this.env.logger(this.study, 'skipping sending beep ' + beepId + ' because it is paused')
        newStatus = 7
        break
      default:
        const messageType = daySchedule.statuses[beepIndex] === 3 ? 'reminder' : 'initial'
        const messageStatus = await this.env.messager({
          Message: protocol.getMessage(messageType),
          PhoneNumber: '+1' + this.phone,
        })
        if (messageStatus === 'success') {
          this.env.logger(this.study, 'sent message ' + beepId + (status === 'late' ? ' retroactively' : ''))
          newStatus = messageType === 'initial' ? 2 : 3
        } else {
          this.env.logger(this.study, 'failed to send message ' + beepId + ': ' + messageStatus)
          return
        }
    }
    daySchedule.statuses[beepIndex] = newStatus
    this.env.updater(this.study, this.id, this.export())
  }
  export() {
    const spec: Partial<Participant> = {}
    ;[
      'id',
      'start_day',
      'end_day',
      'start_time',
      'end_time',
      'protocols',
      'blackouts',
      'daysofweek',
      'order_type',
      'phone',
      'schedule',
      'protocol_order',
      'timezone',
      'study',
    ].forEach(key => {
      const value = this[key as keyof Participant]
      ;(spec[key as keyof Participant] as typeof value) = value
    })
    return JSON.parse(JSON.stringify(spec)) as Participant
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
