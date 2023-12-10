export type User = {
  email: string
  view_study: boolean
  view_participant: boolean
  view_protocol: boolean
  view_user: boolean
  view_log: boolean
  add_study: boolean
  add_participant: boolean
  add_protocol: boolean
  add_user: boolean
  add_log: boolean
  remove_study: boolean
  remove_participant: boolean
  remove_protocol: boolean
  remove_user: boolean
  remove_log: boolean
}

export type Protocol = {
  accesses: number
  days: number
  beeps: number
  close_after: number
  color: string
  id_parameter: string
  initial_message: string
  link: string
  minsep: number
  name: string
  offset: number
  randomization: 'independent' | 'binned' | 'none'
  random_start: boolean
  reminder_link: boolean
  reminder_message: string
  reminder_after: number
}

export type Blackout = {index: number; start: string; end: string}

// export type Participant = {
//   id: string
//   daysofweek: boolean[]
//   end_day: string
//   end_time: string
//   first: number
//   last: number
//   order_type: 'shuffle' | 'sample' | 'ordered'
//   phone: number
//   protocol_days: {[index: string]: number}
//   protocol_order: string[]
//   protocols: string[]
//   schedule: Schedule[]
//   start_day: string
//   start_time: string
//   timezone: number
//   blackouts?: Blackout[]
// }

export type Schedule = {
  accessed_first: number[]
  accessed_n: number[]
  date: number
  day: number
  message?: {initial?: MessageReceipt; reminder?: MessageReceipt}[]
  protocol: string
  statuses: number[]
  times: number[]
}

export type MessageReceipt = {
  messageId: string
  providerResponse: string
  status: 'SUCCESS' | 'FAILURE'
  timestamp: string
}
