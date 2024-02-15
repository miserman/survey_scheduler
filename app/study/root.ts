import type {Protocol, User} from './types'
import Participant from './classes/participant'

export const MS_SECOND = 1000
export const MS_MINUTE = MS_SECOND * 60
export const MS_HOUR = MS_MINUTE * 60
export const MS_DAY = MS_HOUR * 24
export const MS_WEEK = MS_DAY * 7
export const TIMEZONE_OFFSET = new Date().getTimezoneOffset() * MS_MINUTE

export const formatDay = Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit'})
const patterns = {
  addRemove: /^(?:add_|remove_)/,
  add: /^add_/,
  remove: /^remove_/,
  noRecord: /not on record/,
  period: /\./g,
  idPhone: /^(?:id|phone)$/,
  d7: /\d{7}/,
  dashdate: /^\d{4}-\d{2}-\d{2}$/,
  stripdate: /\d{2}(?=\d{2}$)|[^0-9]/g,
  gcm: /[^\u0000-\u007f]/g,
  http: /(https?:\/\/(.+$))/,
  pButton: /^(?:P|BUTTON)$/,
  crs: /^(?:cancel|remove|set)$/,
  qmark: /\?/,
  space: /\s/g,
  colonspace: /[:\s]/g,
  apm: /[ap:]/i,
  anycolon: /:/,
  colon: /:/g,
  a: /a/i,
  p: /p/i,
  time: /^[0-9]{13}$/,
  timestamp: /[^0-9:apm\s-]/gi,
  numpunct: /[^0-9:\s-]/g,
  mli: /(?:message$|link$|^id)/,
  query: /\?.*$/,
  cmli: /(?:color|id|message|link)/,
  slash: /\//g,
  n: /[?&][Nn]=(\d+)/,
}
export const former = {
  time: Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit'}),
  ftime: Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit', second: 'numeric'}),
  mtime: Intl.DateTimeFormat('en-us', {hour: '2-digit', minute: '2-digit', second: 'numeric', hourCycle: 'h23'}),
  mtime_short: Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit', hourCycle: 'h23'}),
  day: Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit'}),
  date: Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit', year: 'numeric'}),
  dashdate: function (time: number) {
    var s = this.date.format(time).split(patterns.slash)
    return s[2] + '-' + s[0] + '-' + s[1]
  },
}
function timeFromStamp(time: string) {
  var ts = time.split(patterns.space),
    s = ts.length > 1 ? ts[1].split(patterns.colon) : time.split(patterns.colon)
  return s.length > 2
    ? former.ftime.format(new Date().setUTCHours(parseInt(s[0]) || 0, parseInt(s[1]) || 0, parseInt(s[2]) || 0))
    : time
}
function timeTo23h(time: string) {
  var s = time.toString(),
    p = ['', ''],
    n = 0
  if (patterns.apm.test(s)) {
    p = s.replace(patterns.numpunct, '').split(patterns.colon)
    n = parseInt(p[0])
    if (n < 12 && patterns.p.test(s)) {
      n += 12
    } else if (n === 12 && patterns.a.test(s)) n = 0
    s = (n < 10 ? '0' : '') + n
    n = parseInt(p[1])
    s = s + ':' + (n < 10 ? '0' : '') + n
  }
  return s
}
export function timeToMs(time: string) {
  var s = time.toString(),
    p = ['', ''],
    n = 0
  if (patterns.apm.test(s)) {
    if (patterns.anycolon.test(s)) {
      p = s.replace(patterns.numpunct, '').split(patterns.colon)
      n = parseInt(p[0])
      if (n < 12 && patterns.p.test(s)) {
        n += 12
      } else if (n === 12 && patterns.a.test(s)) n = 0
      n = n * 36e5 + parseInt(p[1]) * 6e4 + (p.length === 3 ? parseInt(p[2]) * 1e3 : 0)
    } else {
      n = parseFloat(s.replace(patterns.numpunct, ''))
      if (n < 12 && patterns.p.test(s)) n += 12
      n *= 36e5
    }
  } else {
    n = parseFloat(time)
    if (n < 36e5) n *= n < 25 ? 36e5 : n < 1440 ? 6e4 : 1e3
  }
  return Math.floor(n)
}

export const statusClasses = [
  'missed',
  'pending',
  'sent',
  'reminded',
  'send_received',
  'remind_received',
  'pause',
  'skipped',
]

export const participants: {[index: string]: Participant} = {}

export type Protocols = {[index: string]: Protocol}
export const protocols: Protocols = {
  New: {
    days: 0,
  },
  signal: {
    name: 'signal',
    color: '#ffcccc',
    days: 0,
    beeps: 6,
    minsep: 30,
    random_start: true,
    randomization: 'binned',
    reminder_after: 10,
    close_after: 30,
    accesses: 1,
    initial_message: 'Please complete this survey within 30 minutes:',
    reminder_message: 'Reminder: complete your survey within 20 minutes.',
    reminder_link: true,
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
  event: {
    name: 'event',
    color: '#83f0ff',
    days: 0,
    beeps: 1,
    offset: 15,
    randomization: 'none',
    initial_message: 'Please complete this survey after any study-relevant event:',
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
}

export const users: {[index: string]: User} = {
  New: {
    email: '',
    view_study: true,
    view_participant: false,
    view_protocol: true,
    view_user: false,
    view_log: false,
    add_study: false,
    add_participant: false,
    add_protocol: false,
    add_user: false,
    add_log: false,
    remove_study: false,
    remove_participant: false,
    remove_protocol: false,
    remove_user: false,
    remove_log: false,
  },
}
