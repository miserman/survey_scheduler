export const MS_SECOND = 1000
export const MS_MINUTE = MS_SECOND * 60
export const MS_HOUR = MS_MINUTE * 60
export const MS_DAY = MS_HOUR * 24
export const MS_WEEK = MS_DAY * 7
export const TIMEZONE_OFFSET = new Date().getTimezoneOffset() * MS_MINUTE

const formatter_date = Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit', year: 'numeric'})
export function format_date(time: number) {
  return formatter_date.format(time)
}

const formatter_time = Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit'})
export function format_time(time: number) {
  return formatter_time.format(time)
}
export function dashdate(time: number) {
  var s = format_date(time).split('/')
  return s[2] + '-' + s[0] + '-' + s[1]
}

const patterns = {
  apm: /[ap:]/i,
  anycolon: /:/,
  colon: /:/g,
  a: /a/i,
  p: /p/i,
  numpunct: /[^0-9:\s-]/g,
}
export function timeToMs(time: string) {
  const s = time.toString()
  let p = ['', '']
  let n = 0
  if (patterns.apm.test(s)) {
    if (patterns.anycolon.test(s)) {
      p = s.replace(patterns.numpunct, '').split(patterns.colon)
      n = +p[0]
      if (n < 12 && patterns.p.test(s)) {
        n += 12
      } else if (n === 12 && patterns.a.test(s)) n = 0
      n = n * 36e5 + +p[1] * 6e4 + (p.length === 3 ? +p[2] * 1e3 : 0)
    } else {
      n = +s.replace(patterns.numpunct, '')
      if (n < 12 && patterns.p.test(s)) n += 12
      n *= 36e5
    }
  } else {
    n = +time
    if (n < 36e5) n *= n < 25 ? 36e5 : n < 1440 ? 6e4 : 1e3
  }
  return Math.floor(n)
}
