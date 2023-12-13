import {TIMEZONE_OFFSET, former} from '../root'
import {Blackout, Protocol, Schedule} from '../types'

export type Participant = {
  id: string
  daysofweek: boolean[]
  end_day: string
  end_time: string
  first: number
  last: number
  order_type: 'shuffle' | 'sample' | 'ordered'
  phone: number
  protocol_days?: {[index: string]: number}
  protocol_order?: string[]
  protocols: string[]
  schedule: Schedule[]
  start_day: string
  start_time: string
  timezone: number
  blackouts: Blackout[]
}

export const makeFullParticipant = (initial: Partial<Participant>) => {
  const date = new Date()
  const today = former.dashdate(date.getTime())
  return {
    id: initial.id || '',
    daysofweek: initial.daysofweek || [true, true, true, true, true, true, true],
    end_day: initial.end_day || today,
    end_time: initial.end_time || today,
    first: initial.first || 0,
    last: initial.last || 0,
    order_type: initial.order_type || 'shuffle',
    phone: initial.phone || 0,
    protocol_days: initial.protocol_days || {},
    protocol_order: initial.protocol_order || [],
    protocols: initial.protocols || [],
    schedule: initial.schedule || [],
    start_day: initial.start_day || today,
    start_time: initial.start_time || former.time.format(date.getTime()),
    timezone: initial.timezone || TIMEZONE_OFFSET / 6e4,
    blackouts: initial.blackouts || [],
  } as Participant
}

export const makeSchedule = (participant: Participant, protocol: Partial<Protocol>, blackouts?: Blackout[]) => {
  const schedule: Schedule = {
    accessed_first: [],
    accessed_n: [],
    date:
      participant.schedule && participant.schedule.length
        ? participant.schedule[participant.schedule.length - 1].date + 864e5
        : new Date(participant.start_day).getTime() + TIMEZONE_OFFSET,
    day: 0,
    protocol: protocol.name || '',
    statuses: [],
    times: [],
  }
  const n = protocol.beeps || 0
  for (let i = 0; i < n; i++) {
    schedule.accessed_first.push(0)
    schedule.accessed_n.push(0)
    schedule.statuses.push(0)
    schedule.times.push(schedule.date + 36e4)
  }
  return schedule
}
