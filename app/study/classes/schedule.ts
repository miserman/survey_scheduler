import {MS_MINUTE} from '../root'
import {Blackout, MessageReceipt, Protocol, ScheduleSpec} from '../types'

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

type Message = {initial?: MessageReceipt; reminder?: MessageReceipt}

export default class Schedule {
  accessed_first: number[] = []
  accessed_n: number[] = []
  date = Date.now()
  messages: Message[] = []
  protocol = ''
  statuses: number[] = []
  times: number[] = []

  blackouts: Blackout[] = []
  constructor(spec?: Partial<ScheduleSpec>) {
    spec &&
      Object.keys(spec).forEach(k => {
        const value = spec[k as keyof ScheduleSpec]
        if ('undefined' !== typeof value) (this[k as keyof ScheduleSpec] as typeof value) = value
      })
  }
  setBeep(index: number, time: number, status = 1, accessed_n = 0, accessed_first = 0, message: Message = {}) {
    this.times[index] = time
    this.statuses[index] = status
    this.accessed_n[index] = accessed_n
    this.accessed_first[index] = accessed_first
    this.messages[index] = message
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
  isOverlapping(index: number, time: number, buffer: number) {
    let overlapping = false
    for (let i = 0; i < index; i++) {
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
  rollTimes(protocol: Protocol, start: number, end: number) {
    let beepIndex = 0
    start = this.adjustForBlackout(start)
    const n = protocol.beeps || 1
    const minsep = (protocol.minsep || 0) * MS_MINUTE
    const binsize = Math.max(Math.floor((end - start) / n), minsep)
    if (!protocol.random_start) {
      this.setBeep(beepIndex++, start)
    }
    const randomization = protocol.randomization || 'none'
    if (randomization === 'none') {
      for (; beepIndex < n; beepIndex++) {
        const time = this.adjustForBlackout(rollMethods.none(this.adjustForBlackout(start), binsize))
        if (time > end) break
        start = time
        this.setBeep(beepIndex, time)
      }
    } else {
      const roller = rollMethods[randomization]
      const limit = 1e5
      for (; beepIndex < n; beepIndex++) {
        let invalid = true
        for (let attempt = 0; attempt < limit; attempt++) {
          const time = this.adjustForBlackout(roller(this.adjustForBlackout(start), end, binsize))
          invalid = time > end || this.isOverlapping(beepIndex, time, minsep)
          if (!invalid) {
            start = time
            this.setBeep(beepIndex, time)
            break
          }
        }
        // if (invalid) throw Error('failed to find a valid time for beep ' + beepIndex)
      }
      if (protocol.randomization === 'independent') this.times.sort()
    }
  }
}
