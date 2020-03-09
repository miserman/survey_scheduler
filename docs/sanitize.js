'use strict'
module.exports = {
  P: {
    email: /^[^@\s]+@[^.\s]+\.[^.\s]{2,}$/i,
    id: /^[a-z0-9_@.-]+$/i,
    time: /^[0-9]{2}:[0-9]{2}/,
    date: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
    study: /^[a-z0-9._-]+$/i,
    type: /^[a-z_]+$/i,
    color: /^#[a-f0-9]{6}$/i,
    word: /^[a-z]$/i,
    non_number: /[^0-9]+/g,
    number: /^[0-9.]+$/,
    numpunct: /[^0-9:\s-]/g,
    bool: /^(?:true|false)$/,
    phone: /^1{0,1}[0-9]{9,10}$/,
    int: /^[0-9]{1,13}$/,
    file: /^[0-9]{6}$/,
  },
  D: {
    email: 'should be an email address; name@domain.com',
    id: 'should only contain letters, numerals, underscores, or dashes',
    time: 'should be a 24 hour time stamp; hh:mm',
    date: 'should be a full year stamp; yyyy-mm-dd',
    study: 'should only contain letters, numerals, dots, underscores, or, dashes, and not matches an existing study or "sessions"',
    type: 'should only contains letters or underscores',
    color: 'should be a HEX code; #rrggbb',
    word: 'should only contain lowercase letters',
    number: 'should only contain numerals or periods',
    numpunct: 'should only contain numerals, colons, dashes, or spaces',
    bool: 'should only be "true" or "false"',
    phone: 'should be a 10 digit number',
    file: 'should be a 6 digit date; mmddyy'
  },
  M: [],
  gen: function(t, v){
    this.M = this.P[t].exec(v)
    return this.M ? this.M[0] : ''
  },
  string: function(s){
    s = String(s)
    return 'undefined' === s || 'null' === s ? '' : s
  },
  phone: function(n){
    n = String(n).replace(this.P.non_number, '')
    return parseInt(n.slice(-10))
  },
  dashdate: function(d){
    d = String(d).replace(this.P.numpunct, '')
    return this.gen('date', d)
  },
  timestamp: function(t){
    t = String(t).replace(this.P.numpunct, '')
    return this.gen('time', t)
  },
  file: function(f){
    f = String(f).replace(this.P.non_number, '')
    return this.gen('file', f)
  },
  protocol_names: function(a){
    a = Object(a)
    for(var n = a.length, i = 0, r = []; i < n; i++){
      r.push(this.gen('type', a[i]))
    }
    return r
  },
  intObject: function(a){
    a = Object(a)
    for(var n = a.length, i = 0, r = []; i < n; i++){
      r.push(parseInt(a[i]))
    }
    return r
  },
  boolObject: function(a){
    a = Object(a)
    for(var n = a.length, i = 0, r = []; i < n; i++){
      r.push(Boolean(a[i]))
    }
    return r
  },
  blackouts: function(a){
    a = Object(a)
    for(var n = a.length, i = 0, r = [], s, e; i < n; i++){
      s = parseInt(a[i].start)
      e = parseInt(a[i].end) || s
      if(!isNaN(s) && !isNaN(e)) r.push({start: s, end: e})
    }
    return r
  },
  schedule_day: function(o){
    o = Object(o)
    var no = {
      date: parseInt(o.date),
      day: parseInt(o.day),
      protocol: this.gen('type', o.protocol),
      statuses: this.intObject(o.statuses),
      times: this.intObject(o.times)
    }
    if(o.hasOwnProperty('blackouts')) no.blackouts = this.blackouts(o.blackouts)
    return no
  },
  schedule: function(a){
    a = Object(a)
    for(var n = a.length, i = 0, r = []; i < n; i++){
      r.push(this.schedule_day(a[i]))
    }
    return r
  },
  participant: function(o){
    o = Object(o)
    var no = {
      id: this.gen('id', o.id),
      phone: this.phone(o.phone),
      timezone: o.hasOwnProperty('timezone') ? parseInt(o.timezone) : new Date().getTimezoneOffset(),
      start_day: this.dashdate(o.start_day),
      end_day: this.dashdate(o.end_day),
      start_time: this.timestamp(o.start_time),
      end_time: this.timestamp(o.end_time),
      first: parseInt(o.first),
      last: parseInt(o.last),
      order_type: this.gen('type', o.order_type),
      protocols: this.protocol_names(o.protocols),
      daysofweek: this.boolObject(o.daysofweek),
      schedule: this.schedule(o.schedule)
    }
    if(o.hasOwnProperty('blackouts')) no.blackouts = this.blackouts(o.blackouts)
    return no
  },
  protocol: function(o){
    o = Object(o)
    var k, r = {
      name: this.gen('type', o.name),
      color: this.gen('color', o.color),
      days: parseFloat(o.days) || 0,
      beeps: parseInt(o.beeps) || 0,
      minsep: parseFloat(o.minsep) || 0,
      offset: parseFloat(o.offset) || 0,
      randomization: String(o.randomization) || 'binned',
      random_start: 'true' === String(o.random_start),
      remind_after: parseFloat(o.remind_after) || 0,
      close_after: parseFloat(o.close_after) || 0,
      initial_message: this.string(o.initial_message),
      reminder_message: this.string(o.reminder_message),
      reminder_link: 'true' === String(o.reminder_link),
      link: this.string(o.link),
      id_parameter: this.gen('id', o.id_parameter)
    }
    for(k in r) if(r.hasOwnProperty(k)) if(!r[k]) delete r[k]
    return r
  },
  protocols: function(o){
    o = Object(o)
    var r = {}, k
    for(k in o) if(o.hasOwnProperty(k)){
      r[k] = this.protocol(o[k])
    }
    return r
  },
  perms_template: function(inital){
    return {
      add_study: inital,
      remove_study: inital,
      view_participant: inital,
      add_participant: inital,
      remove_participant: inital,
      view_protocol: inital,
      add_protocol: inital,
      remove_protocol: inital,
      view_user: inital,
      add_user: inital,
      remove_user: inital,
      view_log: inital,
    }
  },
  user: function(o){
    var r = this.perms_template(false), k
    o = Object(o)
    r.email = this.gen('email', o.email)
    for(k in o) if(r.hasOwnProperty(k) && k !== 'email'){
      r[k] = 'true' === String(o[k])
    }
    return r
  },
}
