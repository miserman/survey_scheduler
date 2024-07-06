export class Blackout {
  start = NaN
  end = NaN
  constructor(blackout?: Partial<Blackout>) {
    const o = Object(blackout) as Partial<Blackout>
    this.start = o.start ? +o.start : Date.now()
    this.end = o.end ? +o.end : this.start
  }
}
