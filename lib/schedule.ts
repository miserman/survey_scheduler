import {MS_MINUTE} from '@/utils/times'
import {Blackout} from './blackout'
import type {MessageReceipts} from './message'
import {Protocol} from './protocol'

export const statusLabels = [
  'missed',
  'pending',
  'sent',
  'reminded',
  'send_received',
  'remind_received',
  'pause',
  'skipped',
]

const rollMethods = {
  none: function (start: number, step: number) {
    return start + step
  },
  independent: function (start: number, max: number) {
    return Math.floor(start + Math.random() * (max - start + 1))
  },
  binned: function (start: number, max: number, binsize: number) {
    const end = Math.min(max, start + binsize)
    return Math.floor(start + Math.random() * (end - start + 1))
  },
}

type LastRoll = {protocol: Protocol; start: number; end: number}
export default class Schedule {
  accessed_first: number[] = []
  accessed_n: number[] = []
  date = Date.now()
  messages: MessageReceipts[] = []
  protocol = ''
  statuses: number[] = []
  times: number[] = []
  blackouts: Blackout[] = []

  lastRollParams: LastRoll | undefined

  constructor(schedule?: Partial<Schedule>, reset?: boolean) {
    if (schedule) {
      const o = Object(schedule)
      if (o.date) this.date = o.date
      if (o.protocol) this.protocol = o.protocol
      if (o.lastRollParams) this.lastRollParams = o.lastRollParams
      if (!reset) {
        ;['accessed_first', 'accessed_n', 'messages', 'statuses', 'times'].forEach(k => {
          if (k in o) {
            const value = o[k as keyof Schedule]
            if ('undefined' !== typeof value)
              (this[k as keyof Schedule] as typeof value) = Array.isArray(value) ? [...value] : value
          }
        })
      }
      if ('blackouts' in o) {
        o.blackouts.forEach((b: Partial<Blackout>) => this.blackouts.push(new Blackout(b)))
      }
    }
  }
  setBeep(index: number, time: number, status = 1, accessed_n = 0, accessed_first = 0, message: MessageReceipts = {}) {
    this.times[index] = time
    this.statuses[index] = status
    this.accessed_n[index] = accessed_n
    this.accessed_first[index] = accessed_first
    this.messages[index] = message
  }
  addBeep() {
    this.setBeep(this.times.length, this.times[this.times.length - 1])
  }
  removeBeep(index: number) {
    this.times.splice(index, 1)
    this.statuses.splice(index, 1)
    this.accessed_n.splice(index, 1)
    this.accessed_first.splice(index, 1)
    this.messages.splice(index, 1)
  }
  setBlackout(index: number, spec: Partial<Blackout>) {
    this.blackouts[index] = new Blackout(spec)
  }
  addBlackout(blackout: Partial<Blackout>) {
    this.blackouts.push(new Blackout(blackout))
  }
  removeBlackout(index: number) {
    this.blackouts.splice(index, 1)
  }
  inBlackout(start: number) {
    const n = this.blackouts.length
    let inBlackout = -1
    if (n) {
      for (let i = 0; i < n; i++) {
        const blackout = this.blackouts[i]
        if (blackout.start <= start && blackout.end >= start) {
          inBlackout = i
          break
        }
      }
    }
    return inBlackout
  }
  isOverlapping(time: number, buffer: number) {
    let overlapping = false
    const n = this.times.length
    for (let i = 0; i < n; i++) {
      if (Math.abs(time - this.times[i]) < buffer) {
        overlapping = true
        break
      }
    }
    return overlapping
  }
  adjustForBlackout(start: number) {
    const which = this.inBlackout(start)
    return which === -1 ? start : this.blackouts[which].end
  }
  rollTimes(protocol?: Protocol, start?: number, end?: number) {
    if (this.lastRollParams) {
      if (!protocol) protocol = this.lastRollParams.protocol
      if (!start) start = this.lastRollParams.start
      if (!end) end = this.lastRollParams.end
    }
    if (!protocol || !start || !end) return
    this.lastRollParams = {protocol, start, end}
    let beepIndex = 0
    start = this.adjustForBlackout(start)
    const n = protocol.beeps || 1
    const minsep = (protocol.minsep || 0) * MS_MINUTE
    const binsize = Math.max(Math.floor((end - start) / n), minsep)
    if (!protocol.random_start) this.setBeep(beepIndex++, start)
    const randomization = protocol.randomization || 'none'
    if (randomization === 'none') {
      for (; beepIndex < n; beepIndex++) {
        const time = this.adjustForBlackout(rollMethods.none(this.adjustForBlackout(start), binsize))
        if (time > end) break
        start = time
        this.setBeep(beepIndex, time)
      }
    } else if (end - start > binsize) {
      const roller = rollMethods[randomization]
      const limit = 1e5
      for (; beepIndex < n; beepIndex++) {
        let invalid = true
        for (let attempt = 0; attempt < limit; attempt++) {
          const time = this.adjustForBlackout(roller(this.adjustForBlackout(start), end, binsize))
          invalid = time > end || this.isOverlapping(time, minsep)
          if (!invalid) {
            if (randomization === 'binned') start = time
            this.setBeep(beepIndex, time)
            break
          }
        }
        if (invalid) console.error('failed to find a valid time for beep ' + beepIndex)
      }
      if (protocol.randomization === 'independent') this.times.sort().reverse()
    }
  }
  copy(protocol?: Protocol) {
    const newSchedule = new Schedule(this, true)
    newSchedule.rollTimes(protocol)
    return newSchedule
  }
}
