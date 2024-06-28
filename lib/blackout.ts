export class Blackout {
  start = NaN
  end = NaN
  constructor(blackout: Partial<Blackout>) {
    const o = Object(blackout) as Partial<Blackout>
    if ('start' in o) this.start = +o
    if ('end' in o) this.end = +o
  }
}
