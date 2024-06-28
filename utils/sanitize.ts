import {Blackout} from '@/lib/blackout'
import {MessageReceipt, MessageReceipts} from '@/lib/message'
import Participant from '@/lib/participant'
import {Protocol} from '@/lib/protocol'
import Schedule from '@/lib/schedule'
import {User} from '@/lib/user'

/**
 * extract recognized types from unknown sources
 */
class Sanitize {
  types = {
    email: {
      p: /^[^@\s]+@[^.\s]+\.[^.\s]{2,}$/i,
      d: 'should be an email address; name@domain.com',
    },
    id: {
      p: /^[a-z0-9_@.-]+$/i,
      d: 'should only contain letters, numerals, underscores, or dashes',
    },
    time: {
      p: /^[0-9]{2}:[0-9]{2}/,
      d: 'should be a 24 hour time stamp; hh:mm',
    },
    date: {
      p: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
      d: 'should be a full year stamp; yyyy-mm-dd',
    },
    study: {
      p: /^[a-z0-9._-]+$/i,
      d: 'should only contain letters, numerals, dots, underscores, or, dashes, and not matches an existing study or "sessions"',
    },
    type: {
      p: /^[a-z0-9_]+$/i,
      d: 'should only contains letters or underscores',
    },
    color: {
      p: /^#[a-f0-9]{6}$/i,
      d: 'should be a HEX code; #rrggbb',
    },
    word: {
      p: /^[a-z]$/i,
      d: 'should only contain lowercase letters',
    },
    non_number: {
      p: /[^0-9]+/g,
      d: 'should not contain any digits',
    },
    number: {
      p: /^[0-9.]+$/,
      d: 'should only contain digits or periods',
    },
    numpunct: {
      p: /[^0-9:\s-]/g,
      d: 'should only contain numerals, colons, dashes, or spaces',
    },
    bool: {
      p: /^(?:true|false)$/,
      d: 'should only be "true" or "false"',
    },
    phone: {
      p: /^1{0,1}[0-9]{9,10}$/,
      d: 'should be a 10 digit number',
    },
    int: {
      p: /^[0-9]{1,13}$/,
      d: 'should be a 10 digit number',
    },
    file: {
      p: /^[0-9]{6}$/,
      d: 'should be a 6 digit date; mmddyy',
    },
  } as const

  /**
   * cast input to specified type
   * @param type name of type to be created
   * @param value value to extract type from
   * @returns string
   */
  make(type: keyof typeof this.types, value: string) {
    const match = this.types[type].p.exec(value)
    return match ? match[0] : ''
  }
  string(s: string) {
    s = '' + s
    return 'undefined' === s || 'null' === s ? '' : s
  }
  phone(n: string | number) {
    n = ('' + n).replace(this.types.non_number.p, '')
    return +n.slice(-10)
  }
  dashdate(d: string) {
    d = ('' + d).replace(this.types.numpunct.p, '')
    return this.make('date', d)
  }
  timestamp(t: string) {
    t = ('' + t).replace(this.types.numpunct.p, '')
    return this.make('time', t)
  }
  file(f: string) {
    f = ('' + f).replace(this.types.non_number.p, '')
    return this.make('file', f)
  }
  protocol_names(names: string[]) {
    const a = Object(names)
    const n = a.length
    const r: string[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = this.make('type', a[i])
    }
    return r
  }
  numberArray(ints: (number | string)[]) {
    const a = Object(ints)
    const n = a.length
    const r: number[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = +a[i]
    }
    return r
  }
  boolArray(bools: (boolean | string)[]) {
    const a = Object(bools)
    const n = a.length
    const r: boolean[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = typeof a[i] ? 'true' === a[i] : !!a[i]
    }
    return r
  }
  message(o: Partial<MessageReceipt>) {
    return new MessageReceipt(o)
  }
  messages(receipts: MessageReceipts[]) {
    const a = Object(receipts)
    const n = a.length
    const r: MessageReceipts[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = new MessageReceipts(a[i])
    }
    return r
  }
  blackouts(Blackouts: Blackout[]) {
    const a = Object(Blackouts)
    const n = a.length
    const r: Blackout[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = new Blackout(a[i])
    }
    return r
  }
  schedule(schedule: Partial<Schedule>) {
    return new Schedule(schedule)
  }
  schedules(schedules: Partial<Schedule>[]) {
    const a = Object(schedules)
    const n = a.length
    const r: Schedule[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = new Schedule(a[i])
    }
    return r
  }
  participant(participant: Partial<Participant>) {
    return new Participant(participant)
  }
  protocol(protocol: Partial<Protocol>) {
    return new Protocol(protocol)
  }
  protocols(protocol: Partial<Protocol>[]) {
    const a = Object(protocol)
    const n = a.length
    const r: Protocol[] = new Array(n)
    for (let i = n; i--; ) {
      r[i] = new Protocol(a[i])
    }
    return r
  }
  user(user: Partial<User>) {
    return new User(user)
  }
}

export default new Sanitize()
