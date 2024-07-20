const stringParams = [
  'name',
  'color',
  'id_parameter',
  'initial_message',
  'link',
  'reminder_message',
] as (keyof Protocol)[]
const numberParams = [
  'accesses',
  'days',
  'beeps',
  'close_after',
  'minsep',
  'offset',
  'reminder_after',
] as (keyof Protocol)[]
const randomizationOptions = ['independent', 'binned', 'none']
const urlProtocol = /^https?:\/\//
const urlSearch = /\?/

export class Protocol {
  name = ''
  accesses = 1
  days = 0
  beeps = 1
  close_after = 0
  color = '#555555'
  id_parameter = ''
  initial_message = ''
  link = ''
  minsep = 0
  offset = 0
  randomization: 'independent' | 'binned' | 'none' = 'binned'
  random_start = false
  reminder_link = false
  reminder_message = ''
  reminder_after = 0
  constructor(protocol?: Partial<Protocol>) {
    const o = Object(protocol || {}) as Partial<Protocol>
    stringParams.forEach(k => {
      if (k in o) this[k as 'name'] = '' + o[k]
    })
    if ('randomization' in o) {
      const raw = o.randomization
      if ('undefined' !== typeof raw && randomizationOptions.includes(raw)) this.randomization = raw
    }
    numberParams.forEach(k => {
      const raw = o[k]
      if ('undefined' !== typeof raw) this[k as 'days'] = +raw
    })
    if ('random_start' in o)
      this.random_start = 'string' === typeof o.random_start ? 'true' === o.random_start : !!o.random_start
    if ('reminder_link' in o)
      this.reminder_link = 'string' === typeof o.reminder_link ? 'true' === o.reminder_link : !!o.reminder_link
  }
  export() {
    const res: Partial<Protocol> = {}
    Object.keys(this).forEach(k => {
      const value = this[k as keyof Protocol] as string
      if (value) (res[k as keyof Protocol] as string) = value
    })
    return res
  }
  getMessage(type: 'initial' | 'reminder', id?: string) {
    const base = this[`${type}_message`]
    const link = this.link ? ' ' + this.link.replace(urlProtocol, '') : ''
    const idParam = id && this.id_parameter ? (urlSearch ? '&' : '?') + this.id_parameter + '=' + id : ''
    return base + link + idParam
  }
}

export type Protocols = {[index: string]: Protocol}
