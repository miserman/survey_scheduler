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
  const time = Date.now()
  const today = former.dashdate(time)
  const copy = JSON.parse(JSON.stringify(initial))
  return {
    id: copy.id || '',
    daysofweek: copy.daysofweek || [true, true, true, true, true, true, true],
    end_day: copy.end_day || today,
    end_time: copy.end_time || today,
    first: copy.first || 0,
    last: copy.last || 0,
    order_type: copy.order_type || 'shuffle',
    phone: copy.phone || 0,
    protocol_days: copy.protocol_days || {},
    protocol_order: copy.protocol_order || [],
    protocols: copy.protocols || [],
    schedule: copy.schedule || [],
    start_day: copy.start_day || today,
    start_time: copy.start_time || former.time.format(time),
    timezone: copy.timezone || TIMEZONE_OFFSET / 6e4,
    blackouts: copy.blackouts || [],
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
