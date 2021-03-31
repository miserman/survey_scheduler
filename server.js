'use strict'
var express = require('express'), app = express(), aws = require('aws-sdk'),
  crypto = require('crypto'), jwt = require('jsonwebtoken'), pem = require('jwk-to-pem'),
  fs = require('fs'), http = require('https'), Sanitize = require('./docs/sanitize.js'), date_formatter = Intl.DateTimeFormat('en-us',
    { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: 'numeric' }),
  ddb, database, users, message, messageIds = {}, patterns = { colon: /:/g, slash: /\//g }, report_record = { from: 0, scheduled: -1 },
  nthscan = 100, studies = { 'demo': { dbcopy: { Items: [] }, participants: {}, protocols: {}, users: {} } }, last_sent = 0,
  keys = [], sessions = {}, beeps = {}, held = {}, logs = { enabled: true, dir: 'var/log/scheduler' }, cookie_options = {
    signed: true,
    secure: false,
    httpOnly: true,
    secret: crypto.randomBytes(36).toString('hex')
  }, base_parmissions = {
    'load_schedule': true,
    'rescan': true,
    'list_logs': true,
    'list_studies': true
  }
var path = require('path');
var parser = require('body-parser');
var urlencodedParser = parser.urlencoded({ extended: false })
// var userid, phonenumber;
var queried_userid, queried_phonenumber, queried_date, queried_time, queried_reason;
var queried_user;
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/docs'));
console.log(__dirname);
app.set('views', path.join(__dirname, '/docs'))
if (logs.enabled) try {
  fs.mkdir(logs.dir, { recursive: true }, function (e) { })
} catch (e) {
  console.log('failed to create logs directory, so disabled logging')
  logs.enabled = false
}
process.env.DOUBLECHECK_FREQ = process.env.DOUBLECHECK_FREQ ? parseInt(process.env.DOUBLECHECK_FREQ) : 0
process.env.REPORT_HOUR = 'undefined' !== typeof process.env.REPORT_HOUR ? parseInt(process.env.REPORT_HOUR) : -1
if (!process.env.NOTIFICATIONS) process.env.REPORT_HOUR = -1
app.use(require('body-parser').json())
app.use(require('cookie-parser')(cookie_options.secret))
app.use(express.static('./docs'))
message = new aws.SNS({ region: process.env.REGION })
ddb = new aws.DynamoDB({ region: process.env.REGION_DB })
database = new aws.DynamoDB.DocumentClient({ region: process.env.REGION_DB })
users = new aws.CognitoIdentityServiceProvider({ region: process.env.REGION })
process.env.ISSUER = 'https://cognito-idp.' + process.env.REGION + '.amazonaws.com/' + process.env.USERPOOL
http.get(process.env.ISSUER + '/.well-known/jwks.json', function (res) {
  res.on('data', function (d) { keys.push(d) })
  res.on('end', function () { keys = JSON.parse(keys.join('')).keys })
}).end()
function verify_jwt(token) {
  var i = keys.length, r, t = jwt.decode(token, { complete: true }), p
  if (t && t.header && t.header.alg === 'RS256') {
    p = t.payload
    if (p.exp > Date.now() / 1e3 && p.token_use === 'access' && p.iss === process.env.ISSUER && p.client_id === process.env.CLIENT) {
      for (; i--;) if (keys[i].kid === t.header.kid) break
      if (i !== -1) r = jwt.verify(token, pem(keys[i]))
    }
  }
  return r
}
function log(s, entry) {
  var date = date_formatter.format(new Date()).split(', '), m = s + '_' + date[0].replace(patterns.slash, '') + '.txt'
  console.log(m + ' - ' + date[1] + ': ' + entry)
  if (logs.enabled) fs.appendFile(logs.dir + '/' + m, date[1] + ': ' + entry + '\n', function (e) {
    if (e) console.log('log error: ', e)
  })
}
function update_studies(m, s, name, protocols) {
  if (!studies.hasOwnProperty(s)) {
    var p = {}, k
    for (k in protocols) if (protocols.hasOwnProperty(k)) p[k] = Sanitize.protocol(protocols[k])
    studies[s] = { dbcopy: { Items: [] }, participants: {}, protocols: p, users: {} }
    studies[s].users[name] = Sanitize.perms_template(true)
    if (name !== process.env.ADMIN) studies[s].users[process.env.ADMIN] = Sanitize.perms_template(true)
  }
  database.put({
    TableName: 'studies',
    Item: { study: s, protocols: studies[s].protocols, users: studies[s].users }
  }, function (e, d) {
    if (e) {
      console.log('update studies error: ', e)
      log(s, m + 'false')
    } else {
      log(s, m + 'true')
    }
  })
}
function time_exists(s, id, day, index) {
  var exists = studies.hasOwnProperty(s) && studies[s].participants.hasOwnProperty(id) &&
    studies[s].participants[id].hasOwnProperty('schedule') &&
    studies[s].participants[id].schedule.length > day &&
    studies[s].participants[id].schedule[day].hasOwnProperty('times') &&
    studies[s].participants[id].schedule[day].hasOwnProperty('statuses') &&
    studies[s].participants[id].schedule[day].times.length > index &&
    studies[s].participants[id].schedule[day].statuses.length > index
  if (!exists) log(s, 'time was checked and did not exist: ' + id + '[' + day + '][' + index + ']')
  return exists
}
function update_status(s, id, day, index, status, checkin, first, message_meta) {
  var l = 'schedule[' + day + '].', m = '', mtype = status === 2 ? 'initial' : 'reminder', n = 0, exists = false, mo, i, req = {}
  if (time_exists(s, id, day, index)) {
    status = status ? parseInt(status) : studies[s].participants[id].schedule[day].statuses[index]
    first = first || studies[s].participants[id].schedule[day].accessed_first[index]
    n = studies[s].participants[id].schedule[day].accessed_n[index]
    if (checkin) n++
    req = {
      TableName: s,
      Key: { id: id },
      UpdateExpression: 'SET ' + l + 'statuses[' + index + '] = :s, ' + l + 'accessed_first[' + index + '] = :f, '
        + l + 'accessed_n[' + index + '] = :n',
      ExpressionAttributeValues: { ':s': status, ':f': first, ':n': n }
    }
    // mo -> day of the schedule is being accessed
    mo = studies[s].participants[id].schedule[day]
    if (message_meta) {
      messageIds[message_meta.messageId] = [s, id, day, index, status]
      if (message_meta.hasOwnProperty('status') && mo.statuses[index] !== status) req.ExpressionAttributeValues[':s'] = status = mo.statuses[index]
      exists = mo.hasOwnProperty('messages') && mo.messages.length > index &&
        (mo.messages[index].hasOwnProperty('initial') || mo.messages[index].hasOwnProperty('reminder'))
      if (exists) {
        console.log('message exists: ', message_meta)
        m = ', ' + l + 'messages[' + index + '].' + mtype + ' = :m'
        req.ExpressionAttributeValues[':m'] = message_meta
      } else {
        console.log('message does not exists: ', message_meta)
        if (mo.hasOwnProperty('messages')) {
          m = ', ' + l + 'messages[' + index + '] = :m'
          req.ExpressionAttributeValues[':m'] = {}
          req.ExpressionAttributeValues[':m'][mtype] = message_meta
        } else {
          m = ', ' + l + 'messages = :m'
          req.ExpressionAttributeValues[':m'] = []
          for (i = studies[s].participants[id].schedule[day].statuses.length; i--;) req.ExpressionAttributeValues[':m'].push({})
          req.ExpressionAttributeValues[':m'][index][mtype] = message_meta
        }
      }
      req.UpdateExpression += m
    }
    database.update(req, function (e, d) {
      var m = 'update status of ' + id + '[' + day + '][' + index + ']: '
      if (e) {
        console.log('update status error: ', s, e, req)
        m += 'false'
      } else {
        studies[s].participants[id].schedule[day].statuses[index] = status
        if (first) studies[s].participants[id].schedule[day].accessed_first[index] = first
        studies[s].participants[id].schedule[day].accessed_n[index] = n
        studies[s].version = Date.now()
        if (message_meta) {
          if (!mo.hasOwnProperty('messages')) mo.messages = []
          if (mo.messages.length < mo.statuses.length) {
            for (i = mo.statuses.length; i--;) if (i >= mo.messages.length) mo.messages.push({})
          }
          mo.messages[index][mtype] = message_meta
        }
        m += 'true'
      }
      log(s, m)
    })
  }
}
function update_day(s, id, day) {
  if (time_exists(s, id, day, 0)) database.update({
    TableName: s,
    Key: { id: id },
    UpdateExpression: 'SET schedule[' + day + '] = :v',
    ExpressionAttributeValues: { ':v': studies[s].participants[id].schedule[day] }
  }, function (e, d) {
    var m = 'update day ' + day + ' of ' + id + ': '
    if (e) {
      console.log('update day error: ', s, e)
      m += 'false'
    } else {
      m += 'true'
    }
    log(s, m)
  })
}
function email_notification(subj, m) {
  if (process.env.NOTIFICATIONS) message.publish({
    Message: m,
    Subject: subj,
    TopicArn: process.env.NOTIFICATIONS
  }, function (e, d) {
    if (e) console.log('notification was not sent: ' + m)
  })
}
function send_message(s, id, day, index, status) {
  if (time_exists(s, id, day, index)) {
    var now = Date.now(), to = s + id, p = studies[s].participants[id], ds = p.schedule[day], pr = studies[s].protocols[ds.protocol],
      fid = s + '_' + id + '_' + day + '_' + index + '_' + status
    if (!pr) {
      console.log('message for ' + id + '[' + day + '][' + index + '] not sent because protocol ' +
        ds.protocol + ' was not found in study ' + s)
      return
    }
    if (ds.statuses[index] === 6) {
      update_status(s, id, day, index, 7)
    } else if (!held.hasOwnProperty(fid) && ds.statuses[index] === status - 1 && (status === 2 || (status === 3 && pr.reminder_message))) {
      if (now - last_sent < 1e3) return setTimeout(send_message.bind(null, s, id, day, index, 2), 1100)
      last_sent = now
      held[fid] = true
      message.publish({
        Message: pr[status === 3 ? 'reminder_message' : 'initial_message'] + (pr.link ? ' ' +
          (status !== 3 || pr.reminder_link ? pr.link.replace(/^https?:\/\//, '') +
            (/\?/.test(pr.link) ? '&' : '?') + pr.id_parameter + '=' + id : '') : ''),
        PhoneNumber: '+1' + p.phone
      }, function (e, d) {
        var m = ('send ' + (status === 3 ? 'reminder' : 'initial') + ' text to ') + id + '[' + day + '][' + index + ']: ', t,
          now = Date.now()
        if (e) {
          console.log('send message error: ', e)
          m += 'false'
        } else {
          console.log(s, 'Beep ' + d.MessageId + ' sent to ' + id + ' at ' + Date.now())
          ds.statuses[index]++
          m += 'true (' + d.MessageId + ')'
          if (status === 2) {
            if (ds.accessed_n[index] === 0 && pr.remind_after && ds.times[index] + pr.remind_after * 6e4 > now) {
              beeps[s + id + day + index] = setTimeout(send_message.bind(null, s, id, day, index, 3),
                (ds.times[index] + pr.remind_after * 6e4) - now)
              m += '; reminder scheduled'
            } else m += '; no reminder scheduled'
          } else {
            delete beeps[s + id + day + index]
          }
          update_status(s, id, day, index, status, false, 0, { messageId: d.MessageId })
        }
        delete held[fid]
        log(s, m)
      })
    } else log(s, 'skipped sending scheduled beep (' + id + '[' + day + '][' + index + ']) ' + (held.hasOwnProperty(fid) ?
      'because it was in held' : 'due to status: ' + ds.statuses[index] + ', ' + status))
  }
}
function timeadj(d, e) {
  var p = e.split(patterns.colon)
  return d.date + parseInt(p[0]) * 36e5 + parseInt(p[1]) * 6e4 + (p.length === 3 ? parseInt(p[2]) * 1e3 : 0)
}
function schedule(s, id, day) {
  var to = s + id, d = studies[s].participants[id].schedule[day], pr = studies[s].protocols[d.protocol],
    t, minsep, remind, end, n, now = Date.now(), m, i, nt, updated = false, any = false, nmisses = 0, misses = {}
  if (!d) {
    console.log(s + ' ' + id + ': no day found; splicing day ' + day, studies[s].participants[id].schedule)
    studies[s].participants[id].schedule.splice(day, 1)
  } else if (d.hasOwnProperty('times') && pr) {
    minsep = pr.minsep * 6e4
    remind = pr.remind_after * 6e4 || 0
    end = timeadj(d, studies[s].participants[id].end_time)
    for (n = d.times.length, i = 0; i < n; i++) {
      t = d.times[i]
      if (d.messages && d.messages.length > i) {
        if (d.messages[i].hasOwnProperty('initial')) messageIds[d.messages[i].initial.messageId] = [s, id, day, i, 2]
        if (d.messages[i].hasOwnProperty('reminder')) messageIds[d.messages[i].reminder.messageId] = [s, id, day, i, 3]
      }
      if (t - now < 3e8 && (d.statuses[i] === 6 || d.statuses[i] === 1 || (d.statuses[i] === 2 && pr.remind_after && t + remind < now))) {
        nt = 0
        if (d.statuses[i] === 6) {
          if (t < now) {
            updated = true
            d.statuses[i] = 7
          } else setTimeout(send_message.bind(null, s, id, day, i, 7), t - Date.now())
        } else if (t > now || (now < (nt = i === n - 1 ? end < t ? end + 864e5 : end : d.times[i + 1] - minsep) &&
          (!pr.close_after || t + pr.close_after * 6e4 > now) && (d.statuses[i] === 1 ||
            (d.accessed_n[i] === 0 && pr.remind_after && d.times[i] + pr.remind_after * 6e4 < now)))) {
          if (nt) log(s, 'beep ' + id + '[' + day + '][' + i + '] sent retroactively; scheduled for ' + t +
            ', send at ' + Date.now() + ', before ' + nt + '.')
          any = true
          beeps[s + id + day + i] = setTimeout(send_message.bind(null, s, id, day, i, d.statuses[i] === 1 ? 2 : 3), t - Date.now())
        } else if (t < now && d.statuses[i] === 1) {
          updated = true
          d.statuses[i] = 0
          if (!misses.hasOwnProperty(id)) {
            nmisses++
            misses[id] = {}
          }
          if (!misses[id].hasOwnProperty(day)) misses[id][day] = []
          misses[id][day].push(i)
        }
      }
    }
    if (!d.hasOwnProperty('accessed_first') || !d.hasOwnProperty('accessed_n')) {
      updated = true
      d.accessed_first = []
      d.accessed_n = []
      for (; n--;) {
        d.accessed_first.push(0)
        d.accessed_n.push(0)
      }
    }
    if (updated) {
      studies[s].version = Date.now()
      update_day(s, id, day)
    }
  } else console.log(s + ' ' + id + ': day ' + day + (pr ? ' has no times: ' : ' has protocol ' + d.protocol + 'which is not found: '), d)
  return { any: any, nmisses: nmisses, misses: misses }
}
function clear_schedule(s, id) {
  var p = studies[s].participants[id].schedule, d, i, sid = ''
  for (d = p.length; d--;) for (i = p[d].times.length; i--;) if ('undefined' !== beeps[sid = s + id + d + i]) {
    clearTimeout(beeps[sid])
    delete beeps[sid]
  }
}
function scan_database(s) {
  database.scan({ TableName: s, Select: 'ALL_ATTRIBUTES' }, function (e, d) {
    var i, m = 'download ' + s + ' participants database: ', day, any, anyany, res, id, td
    if (e) {
      console.log('scan database error: ', e)
      log(s, m + 'false')
    } else {
      log(s, m + 'true')
      studies[s].version = Date.now()
      if (!studies[s].hasOwnProperty('participants')) studies[s].participants = {}
      for (i = d.Items.length, day; i--;) {
        id = d.Items[i].id
        if (studies[s].participants.hasOwnProperty(id)) clear_schedule(s, id)
        studies[s].participants[id] = d.Items[i]
      }
      studies[s].dbcopy = d
      refresh_schedules(s, true)
    }
  })
}
function refresh_schedules(s, cleared) {
  var id, day, i, any = false, res, td, nmissing = [0, 0], misses = '', missed_days
  if (studies.hasOwnProperty(s)) {
    if (studies[s].hasOwnProperty('participants')) {
      for (id in studies[s].participants) {
        if (!cleared) clear_schedule(s, id)
        for (day = studies[s].participants[id].schedule.length, missed_days = []; day--;) {
          res = schedule(s, id, day)
          if (res.any) any = true
          if (res.nmisses) {
            nmissing[0]++
            for (td in res.misses[id]) if (res.misses[id].hasOwnProperty(td)) {
              nmissing[1]++
              missed_days.push(td + '[' + res.misses[id][td].join(', ') + ']')
            }
          }
        }
        if (missed_days.length) misses += '\n  ' + id + ': ' + missed_days.join(', ')
        if (any) log(s, 'scheduled texts for ' + id)
      }
      if (nmissing[0]) email_notification(
        'Missed Beeps in ' + s,
        (nmissing[1] === 1 ? 'A beep was' : 'Beeps were') + ' missed for ' +
        (nmissing[0] === 1 ? 'a participant' : 'participants') + ' in ' + s + ' (participant: day[times]):\n' + misses
      )
    }
  }
  return any
}
setInterval(function () { for (var s in studies) refresh_schedules(s) }, 3e8)
function scan_studies() {
  database.scan({ TableName: 'studies', Select: 'ALL_ATTRIBUTES' }, function (e, d) {
    var i, m = 'download studies database: '
    if (e) {
      if (e.statusCode && e.statusCode === 400) {
        ddb.createTable({
          TableName: 'studies',
          AttributeDefinitions: [{
            AttributeName: 'study',
            AttributeType: 'S'
          }],
          KeySchema: [{
            AttributeName: 'study',
            KeyType: 'HASH'
          }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
          BillingMode: 'PROVISIONED'
        }, function (e, d) {
          if (e) {
            log('sessions', m + 'false, and failed to create')
          } else {
            log('sessions', m + 'true')
          }
        })
      } else {
        console.log('scan studies error: ', e)
        log('sessions', m + 'false')
      }
    } else {
      if (d.Items.length) {
        log('sessions', m + 'true')
        for (i = d.Items.length; i--;) {
          if (studies.hasOwnProperty(d.Items[i].study)) {
            studies[d.Items[i].study].users = d.Items[i].users
            studies[d.Items[i].study].protocols = d.Items[i].protocols
          } else studies[d.Items[i].study] = {
            dbcopy: { Items: [] },
            participants: {},
            users: d.Items[i].users,
            protocols: d.Items[i].protocols
          }
          scan_database(d.Items[i].study)
        }
      } else log('sessions', 'no items in studies data: ', d)
    }
  })
}
scan_studies()
function scan_local(report) {
  var study, s, participant, p, pr, n, nd, i, day, d, subj, inwindow, timeiw, body = '', date = new Date(),
    now = Date.now(), scanned = [0, 0, 0], caught = {}, events = {}, ps = []
  for (study in studies) if (study !== 'demo' && studies.hasOwnProperty(study) && studies[study].hasOwnProperty('participants')) {
    s = studies[study].participants
    scanned = [0, 0, 0]
    for (participant in s) if (s.hasOwnProperty(participant) && s[participant].hasOwnProperty('last') &&
      s[participant].hasOwnProperty('schedule') && s[participant].last > report_record.from) {
      scanned[0]++
      for (n = s[participant].schedule.length; n--;) {
        scanned[1]++
        day = s[participant].schedule[n]
        pr = studies[study].protocols[day.protocol]
        inwindow = pr && (!pr.close_after || day.times[i] + pr.close_after * 6e4 > now)
        if (day.hasOwnProperty('times') && day.hasOwnProperty('statuses')) {
          for (nd = day.statuses.length, i = 0; i < nd; i++) {
            scanned[2]++
            timeiw = inwindow && (i === nd - 1 || day.times[i + 1] > now)
            if (day.times[i] < now) {
              if (day.statuses[i] === 2 && pr && pr.remind_after && day.times[i] + pr.remind_after * 6e4 < now &&
                timeiw) {
                log(study, 'sending reminder for passed, sent beep: ' + participant + '[' + n + '][' + i + ']')
                send_message(study, participant, n, i, 3)
                if (!caught.hasOwnProperty(study)) caught[study] = []
                caught[study].push(participant + '[' + n + '][' + i + '] (reminder)')
              } else if (day.statuses[i] === 1 && timeiw) {
                log(study, 'sending passed, pending beep: ' + participant + '[' + n + '][' + i + ']')
                send_message(study, participant, n, i, 2)
                if (!caught.hasOwnProperty(study)) caught[study] = []
                caught[study].push(participant + '[' + n + '][' + i + ']')
                schedule(study, participant, n)
              } else if (report && day.times[i] > report_record.from && day.statuses[i] > 1 && day.statuses[i] < 8) {
                if (!events.hasOwnProperty(study)) events[study] = {}
                if (!events[study].hasOwnProperty(participant)) events[study][participant] = [0, 0, 0, 0, 0, 0, 0, 0]
                events[study][participant][day.statuses[i] - 2]++
                events[study][participant][7] += day.accessed_n[i] !== 0
                if (day.hasOwnProperty('messages') && day.messages.length > i) {
                  if ((day.messages[i].hasOwnProperty('initial') && day.messages[i].initial.status === 'FAILURE')
                    || (day.messages[i].hasOwnProperty('reminder') && day.messages[i].reminder.status === 'FAILURE')) events[study][participant][6]++
                }
                console.log('event for ' + study + ', ' + participant + ': ' + day.statuses[i] - 2)
              }
            }
          }
        }
      }
    }
    if (scanned[0] && !nthscan--) {
      nthscan = 100
      log(study, 'scanned ' + scanned[0] + ' participants, ' + scanned[1] + ' days, and ' + scanned[2] + ' times. (100th since last report)')
    }
  }
  subj = 'Caught Beeps in '
  n = 0
  for (study in caught) if (caught.hasOwnProperty(study)) {
    subj += (n++ ? ', ' : '') + study
    body += '\n  ' + study + ': ' + caught[study].join(', ')
  }
  if (n) email_notification(
    subj, (caught.length === 1 ? 'A beep was' : 'Some beeps were') +
    ' missed initially, but caught by the independent scan (study: participant[day][beep]):\n' + body
  )
  if (report) {
    body = ''
    n = 0
    scanned = [0, 0, 0]
    for (study in events) if (events.hasOwnProperty(study)) {
      body += '\n\nBeeps in ' + study + ':\n'
      for (participant in events[study]) if (events[study].hasOwnProperty(participant)) {
        n++
        ps = events[study][participant]
        ps[4] += ps[5]
        ps[0] += ps[1] + ps[2] + ps[3]
        scanned[0] += ps[0] + ps[1]
        scanned[1] += ps[2] + ps[3]
        scanned[3] += ps[4]
        body += '\n  ' + participant + ':' + (ps[0] ? ' Responded to ' + ps[7] + ' of ' + ps[0] +
          ' sent ' + (ps[0] === 1 ? 'beep.' : 'beeps.') : '') + (ps[4] ? ' ' + ps[4] + (ps[4] === 1 ?
            ' beep was' : ' beeps were') + ' skipped.' : '') + (ps[6] ? ' The delivery of ' + ps[6] + ' sent beep' +
              (ps[6] === 1 ? '' : 's') + ' failed.' : '')
      }
    }
    if (n) email_notification(
      'Status Report for ' + date.toLocaleDateString(),
      'Beeps were scheduled for ' + n + ' participants between ' +
      new Date(report_record.from).toString() + ' and ' + new Date(date).toString() + ':' + body
    )
  }
}
if (process.env.DOUBLECHECK_FREQ) setInterval(scan_local, process.env.DOUBLECHECK_FREQ * 6e4)
function scan_for_report() {
  if (process.env.REPORT_HOUR > -1) {
    var now = Date.now(), to = new Date().setHours(process.env.REPORT_HOUR, 0, 0, 0) - now
    clearTimeout(report_record.scheduled)
    report_record.scheduled = setTimeout(scan_for_report, to < 0 ? to + 864e5 : to)
    if (!report_record.from) report_record.from = now - 864e5
    if (report_record.from + 36e5 < now) {
      scan_local(true)
      report_record.from = now
    }
  }
}
scan_for_report()
function add_user(o, m, s, base_perms, email, username, req, res) {
  req.body.object = Sanitize.user(req.body.object)
  for (var k in req.body.object) if (req.body.object.hasOwnProperty(k) && 'boolean' === typeof req.body.object[k])
    req.body.object[k] = req.body.object[k] && base_perms.hasOwnProperty(k) && base_perms[k]
  database.update({
    TableName: 'studies',
    Key: { study: s },
    UpdateExpression: 'SET #u.#n = :p',
    ExpressionAttributeNames: { '#u': 'users', '#n': username },
    ExpressionAttributeValues: { ':p': req.body.object }
  }, function (e, d) {
    if (e) {
      m += 'false'
      res.status(400).json(o)
    } else {
      if (studies[s].users.hasOwnProperty(username)) {
        m += 'true'
        o.status = 'updated user ' + email
      } else {
        m += 'true, added to database'
        o.status = 'added user ' + email
      }
      studies[s].users[username] = req.body.object
      studies[s].version = o.version = Date.now()
      res.json(o)
    }
    log(s, m)
  })
}
app.post('/status', function (req, res) {
  if (req.body) {
    var body = { messageId: String(req.body.messageId) }, cords = ['', '', 0, 0, 0], d, mtype
    if (body.messageId && messageIds.hasOwnProperty(body.messageId)) {
      cords = messageIds[body.messageId]
      mtype = cords[4] === 2 ? 'initial' : 'reminder'
      d = studies[cords[0]].participants[cords[1]].schedule[cords[2]]
      if (d.messages && d.messages.length > cords[3]) {
        body.providerResponse = String(req.body.providerResponse)
        body.timestamp = String(req.body.timestamp)
        body.status = String(req.body.status)
        update_status(cords[0], cords[1], cords[2], cords[3], cords[4], false, 0, body)
      } else log(cords[0], 'received failed status for message ' + body.messageId + ', but could not find it in ' +
        cords[1] + '[' + cords[2] + ']')
    }
  }
  res.sendStatus(200)
})
app.get('/session', function (req, res) {
  var r = { signedin: false, expires: Date.now() + 36e5 }
  if (req.signedCookies.id && sessions.hasOwnProperty(req.signedCookies.id)) {
    sessions[req.signedCookies.id].expires = r.expires
    r.signedin = true
  }
  res.json(r)
})
app.post('/checkin', function (req, res) {
  var r = { available: false, accessed: 0, days: 0, day: 0, beeps: 0, beep: 0 }, td = new Date().setHours(0, 0, 0, 0),
    pd = td - 864e5, pdm, n = Date.now(), id = Sanitize.gen('id', req.body.id), access = Boolean(req.body.access),
    k, s, p, pp, d, pr, i, t, sid, m, day, status
  if (id) {
    for (k in studies) if (studies.hasOwnProperty(k) && studies[k].participants.hasOwnProperty(id)) s = k
    if (s) {
      m = (access ? 'access' : 'checkin') + ' by ' + id + ', day: '
      for (p = studies[s].participants[id], d = p.schedule.length; d--;) {
        day = new Date(p.schedule[d].date).setHours(0, 0, 0, 0)
        if (td === day || (pdm = pd === day)) {
          r.days = p.schedule.length
          r.day = d + 1
          m += r.day + ', beep: '
          for (pp = p.schedule[d], pr = studies[s].protocols[pp.protocol], i = pp.times.length; i--;) {
            t = pp.times[i]
            if (t < n && (!pr.close_after || t + pr.close_after * 6e4 > n)) {
              status = pp.statuses[i]
              r.accessed = pp.accessed_n[i]
              r.available = pr.accesses ? r.accessed < pr.accesses : true
              r.beeps = pp.times.length
              r.beep = i + 1
              m += i + ', ' + (r.available ? '' : 'not ') + 'available'
              if (access) {
                if (pr.reminder_message && status < 4) {
                  status = status === 3 ? 5 : 4
                  if (beeps.hasOwnProperty(sid = s + id + d + i)) {
                    clearTimeout(beeps[sid])
                    delete beeps[sid]
                    log(s, 'reminder canceled for ' + id + '[' + d + '][' + i + ']')
                  }
                }
                update_status(s, id, d, i, status, true, r.accessed === 0 ? n : 1)
              }
              break
            }
          }
          if (pdm || r.available) break
        }
      }
      log(s, m)
    }
  }
  res.json(r)
})
app.get('/signin', function (req, res) {
  var id = crypto.randomBytes(50).toString('hex')
  cookie_options.sameSite = 'lax'
  res.cookie('id', id, cookie_options)
  log('sessions', 'signin attempt from ' + req.ip)
  res.redirect(
    'https://' + process.env.DOMAIN + '.auth.' + process.env.REGION + '.amazoncognito.com/login?' +
    'response_type=code&scope=email&redirect_uri=' + process.env.REDIRECT + '&' +
    'state=' + id + '&client_id=' + process.env.CLIENT
  )
})
app.get('/signout', function (req, res) {
  var id = req.signedCookies.id
  if (id && sessions.hasOwnProperty(id)) {
    log('sessions', 'signout from ' + req.ip + ' (' + sessions[id].access ? sessions[id].access.username : 'unknown' + ')')
    delete sessions[id]
  }
  cookie_options.sameSite = 'lax'
  id = crypto.randomBytes(50).toString('hex')
  res.cookie('id', id, cookie_options)
  res.redirect(
    'https://' + process.env.DOMAIN + '.auth.' + process.env.REGION + '.amazoncognito.com/logout?' +
    'response_type=code&scope=email&redirect_uri=' + process.env.REDIRECT + '&' +
    'state=' + id + '&client_id=' + process.env.CLIENT
  )
})
app.get('/auth', function (req, res) {
  if (req.query && req.query.code && req.query.state && req.signedCookies.id && req.query.state === req.signedCookies.id) {
    var body = 'grant_type=authorization_code&redirect_uri=' + process.env.REDIRECT + '&client_id=' + process.env.CLIENT +
      '&code=' + req.query.code, now = Date.now(), id = crypto.randomBytes(36).toString('hex'), k, token
    for (k in sessions) if (sessions.hasOwnProperty(k) && sessions[k].expires < now) {
      log('sessions', 'session removed: ' + k)
      delete sessions[k]
    }
    while (sessions.hasOwnProperty(id)) id = crypto.randomBytes(36).toString('hex')
    cookie_options.sameSite = 'strict'
    res.cookie('id', id, cookie_options)
    token = http.request({
      'method': 'POST',
      'hostname': process.env.DOMAIN + '.auth.' + process.env.REGION + '.amazoncognito.com',
      'path': '/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, function (r) {
      var data = []
      r.on('data', function (d) { data.push(d) })
      r.on('end', function () {
        data = JSON.parse(data.join(''))
        sessions[id] = {
          expires: now + 36e5,
          tokens: data,
          access: verify_jwt(data.access_token)
        }
        if (sessions[id].access) {
          sessions[id].verified = true
          log('sessions', 'session established from ' + req.ip + ' (' + sessions[id].access.username + ')')
        }
        res.redirect('/')
      })
    })
    token.on('error', function (e) { console.log('token error: ', e) })
    token.write(body)
    token.end()
  } else {
    log('sessions', 'invalid auth attempt from ' + req.ip)
    res.redirect('/')
  }
})
app.post('/operation', function (req, res) {
  var id = req.signedCookies.id, nid = Sanitize.gen('id', req.body.id), name, type = 'none',
    check = { valid: false, expired: false, pass: false }, s = Sanitize.gen('study', req.body.study), o, m
  if (id) {
    if (req.body.hasOwnProperty('type')) type = Sanitize.gen('type', req.body.type)
    check.session = sessions.hasOwnProperty(id)
    if (check.session) {
      check.valid = sessions[id].verified
      check.expired = sessions[id].expires < Date.now()
      check.pass = check.valid && !check.expired
      if (check.pass) {
        name = sessions[id].access.username
        if (!studies.hasOwnProperty(s) && process.env.ADMIN !== name) {
          check.perms = Sanitize.perms_template(false)
          for (m in studies) if (studies.hasOwnProperty(m) && studies[m].users.hasOwnProperty(name) &&
            studies[m].users[name].add_study) check.perms.add_study = true
        } else {
          check.perms = studies.hasOwnProperty(s) && studies[s].users.hasOwnProperty(name)
            ? studies[s].users[name] : Sanitize.perms_template(process.env.ADMIN === name)
        }
        check.pass = base_parmissions.hasOwnProperty(type) || (check.perms.hasOwnProperty(type) && check.perms[type])
      }
      if (s && !studies.hasOwnProperty(s)) s = s.replace(/[^a-z0-9._-]+/gi, '_')
    }
  }
  o = { version: 0 }
  if (check.pass) {
    if (!studies.hasOwnProperty(s)) {
      switch (type) {
        case 'add_study':
          m = 'create database for study ' + s + ': '
          ddb.createTable({
            TableName: s,
            AttributeDefinitions: [{
              AttributeName: 'id',
              AttributeType: 'S'
            }],
            KeySchema: [{
              AttributeName: 'id',
              KeyType: 'HASH'
            }],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            BillingMode: 'PROVISIONED'
          }, function (e, d) {
            var exists = false
            if (e && (!e.message || !(exists = /already exists/.test(e.message)))) {
              console.log('add study error: ', e)
              m += 'false'
              o.status = 'failed to add study ' + s
              res.status(400).json(o)
            } else {
              m += 'true'
              o.status = exists ? 'study ' + s + ' already exists' : 'added study ' + s
              update_studies(m, s, name, req.body.protocols)
              res.json(o)
            }
            log(s, m)
          })
          break
        case 'list_studies':
          var ss = [], s, u
          for (s in studies) if (studies.hasOwnProperty(s)) {
            for (u in studies[s].users) if (name === u) {
              ss.push(s)
              break
            }
          }
          log('sessions', 'listed ' + name + "'s studies")
          res.json(ss)
          break
        default:
          o.status = 'study ' + s + ' not on record'
          o.signedin = check.signedin
          res.status(400).json(o)
      }
    } else {
      o.version = studies[s].version
      switch (type) {
        case 'load_schedule':
          req.body.version = parseInt(req.body.version)
          if (req.body.version && req.body.version === studies[s].version) {
            o.status = 'study is up-to-date'
            res.json(o)
            break
          }
          var k, r = { version: studies[s].version, participants: {}, protocols: studies[s].protocols, users: {} }
          if (check.perms.view_participant) {
            r.participants = studies[s].participants
          } else for (k in studies[s].participants) if (studies[s].participants.hasOwnProperty(k)) {
            r.participants[k] = { schedule: studies[s].participants[k].schedule }
          }
          if (check.perms.view_user) r.users = studies[s].users
          res.json(r)
          break
        case 'rescan':
          scan_database(s)
          o.status = 'downloaded database for study ' + s
          res.json(o)
          break
        case 'remove_study':
          m = 'delete database for study ' + s + ': '
          ddb.deleteTable({
            TableName: s
          }, function (e, d) {
            m += e ? 'false' : 'true'
            database.delete({
              TableName: 'studies',
              Key: { study: s }
            }, function (e, d) {
              if (e) {
                console.log('remove study error: ', e)
                log(s, m + ', failed to remove from database')
                o.status = /does not exists/.test(e.message) ? 'study ' + s + ' does not exist' : 'failed to remove study ' + s
                res.status(400).json(o)
              } else {
                delete studies[s]
                log(s, m + ', removes from database')
                o.status = 'removed study ' + s
                res.json(o)
              }
            })
          })
          break
        case 'add_participant':
          var existing = studies[s].participants.hasOwnProperty(nid)
          m = (existing ? 'update' : 'create') + ' participant ' + nid + ': '
          if (existing) clear_schedule(s, nid)
          req.body.object = Sanitize.participant(req.body.object)
          database.put({
            TableName: s,
            Item: req.body.object
          }, function (e, d) {
            if (e) {
              console.log('add participant error: ', e)
              log(s, m + 'false')
              o.status = 'failed to add participant ' + nid
              res.status(400).json(o)
            } else {
              log(s, m + 'true')
              if (existing) {
                for (var i = studies[s].dbcopy.Items.length; i--;) {
                  if (studies[s].dbcopy.Items[i] === nid) {
                    studies[s].dbcopy.Items[i] = req.body.object
                    break
                  }
                }
              } else {
                studies[s].dbcopy.Items.push(req.body.object)
              }
              studies[s].participants[nid] = req.body.object
              for (var day = req.body.object.schedule.length, sres, misses = '', missed_days = []; day--;) {
                sres = schedule(s, nid, day)
                if (sres.misses.hasOwnProperty(nid)) if (sres.misses[nid].hasOwnProperty(day))
                  missed_days.push(day + '[' + sres.misses[nid][day].join(', ') + ']')
              }
              if (missed_days.length) {
                email_notification(
                  'Missed Beeps in ' + s,
                  'Participant ' + nid + ' was added to ' + s +
                  ' with passed beeps, which were marked as missed (day[times]):\n\n  ' + missed_days.join(', ')
                )
              }
              studies[s].version = o.status = Date.now()
              o.status = (existing ? 'updated' : 'created') + ' participant ' + nid
              res.json(o)
            }
          })
          break
        case 'remove_participant':
          m = 'remove participant ' + nid + ': '
          clear_schedule(s, nid)
          database.delete({
            TableName: s,
            Key: { id: nid }
          }, function (e, d) {
            if (e) {
              console.log('remove participant error: ', e)
              log(s, m + 'false')
              o.status = /does not exists/.test(e.message) ? 'participant ' + nid + ' does not exist' : 'failed to remove participant ' + nid
              res.status(400).json(o)
            } else {
              delete studies[s].participants[nid]
              log(s, m + 'true')
              studies[s].version = o.version = Date.now()
              o.status = 'removed participant ' + nid
              res.json(o)
            }
          })
          break
        case 'add_protocol':
          m = (studies[s].protocols.hasOwnProperty(nid) ? 'update' : 'create') + ' protocol ' + nid + ': '
          req.body.object = Sanitize.protocol(req.body.object)
          database.update({
            TableName: 'studies',
            Key: { study: s },
            UpdateExpression: 'SET #p.#n = :p',
            ExpressionAttributeNames: { '#p': 'protocols', '#n': nid },
            ExpressionAttributeValues: { ':p': req.body.object }
          }, function (e, d) {
            if (d) {
              m += 'true'
              o.status = (studies[s].protocols.hasOwnProperty(nid) ? 'updated' : 'added') + ' protocol ' + nid
              studies[s].protocols[nid] = req.body.object
              studies[s].version = o.version = Date.now()
              res.json(o)
            }
            if (e) {
              m += 'false'
              console.log('add protocol error: ', e)
              o.status = 'failed to ' + (studies[s].protocols.hasOwnProperty(nid) ? 'update' : 'add') + ' protocol ' + nid
              res.status(400).json(o)
            }
            log(s, m)
          })
          break
        case 'remove_protocol':
          m = 'remove protocol ' + nid + ': '
          database.update({
            TableName: 'studies',
            Key: { study: s },
            UpdateExpression: 'REMOVE #p.#n',
            ExpressionAttributeNames: { '#p': 'protocols', '#n': nid }
          }, function (e, d) {
            if (e) {
              console.log('remove protocol error: ', e)
              m += 'false'
              o.status = 'failed to remove protocol ' + nid
              res.status(400).json(o)
            } else {
              delete studies[s].protocols[nid]
              m += 'true'
              o.status = 'removed protocol "' + nid + '".'
              studies[s].version = o.version = Date.now()
              res.json(o)
            }
            log(s, m)
          })
          break
        case 'add_user':
          var email = nid, k
          for (k in studies[s].users) if (studies[s].users.hasOwnProperty(k) && studies[s].users[k].email === email) {
            nid = k
            break
          }
          if (email !== nid) {
            m = 'update user ' + email + ': '
            add_user(o, m, s, studies[s].users[name], email, nid, req, res)
          } else {
            m = 'add user ' + email + ': '
            if (!nid) {
              log(s, m + 'false')
              o.status = 'no email provided'
              res.status(400).json(o)
            } else {
              users.adminCreateUser({
                UserPoolId: process.env.USERPOOL,
                Username: nid,
                UserAttributes: [{
                  Name: 'email',
                  Value: nid
                }]
              }, function (e, d) {
                if (e) {
                  if (e.message && /already exists/.test(e.message)) {
                    m = 'user ' + nid + ' exists but is not in database, so adding them: '
                    users.adminGetUser({
                      UserPoolId: process.env.USERPOOL,
                      Username: nid
                    }, function (e, d) {
                      if (e) {
                        log(s, m + 'false')
                        o.status = 'failed to retrieve user; try removing them from Cognito manually and readding'
                        res.status(400).json(o)
                      } else add_user(o, m, s, studies[s].users[name], nid, d.Username, req, res)
                    })
                  } else {
                    log(s, m + 'false')
                    o.status = 'failed to ' + (studies[s].users.hasOwnProperty(nid) ? 'update' : 'add') + ' user'
                    res.status(400).json(o)
                  }
                } else add_user(o, m, s, studies[s].users[name], nid, d.User.Username, req, res)
              })
            }
          }
          break
        case 'remove_user':
          m = 'remove user ' + nid + ': '
          if (studies[s].users.hasOwnProperty(nid)) {
            database.update({
              TableName: 'studies',
              Key: { study: s },
              UpdateExpression: 'REMOVE #u.#n',
              ExpressionAttributeNames: { '#u': 'users', '#n': nid }
            }, function (e, d) {
              if (d) {
                delete studies[s].users[nid]
                for (var k in sessions) if (sessions.hasOwnProperty(k) && sessions[k].access.username === nid) {
                  delete sessions[k]
                }
                studies[s].version = o.version = Date.now()
              }
              if (e) console.log('remove user error: ', e)
              log(s, m + (e ? 'true ' : 'false '))
              e = true
              for (m in studies) if (studies.hasOwnProperty(m) && studies[m].users.hasOwnProperty(nid)) e = false
              if (e) {
                users.adminDeleteUser({
                  UserPoolId: process.env.USERPOOL,
                  Username: nid
                }, function (e, d) {
                  m = 'delete user ' + nid + "'s account: "
                  log(s, m + (e ? (/does not exist/.test(e.message) ? 'false, account does not exist' : 'false') : 'true'))
                })
              }
              o.status = 'removed user ' + nid
              res.json(o)
            })
          } else {
            o.status += 'no user with that email exists'
            log(s, m + 'false')
            res.status(400).json(o)
          }
          break
        case 'list_logs':
          if (logs.enabled) {
            m = 'list logs: '
            fs.readdir(logs.dir, function (e, d) {
              if (e) {
                console.log('list logs error: ', e)
                log(s, m + 'false')
                o.status = 'failed to retrieve list of logs'
                res.status(400).json(o)
              } else {
                for (var n = d.length, i = 0, sl = new RegExp('^' + s + '_'), r = /[0-9]{6}/; i < n; i++)
                  if (sl.test(d[i])) o[d[i].match(r)[0]] = ''
                log(s, m + 'true')
                res.json(o)
              }
            })
          } else {
            o.status = 'logging is disabled'
            res.status(400).json(o)
          }
          break
        case 'view_log':
          if (logs.enabled) {
            m = 'retrieve log of ' + req.body.file + ': '
            fs.readFile(logs.dir + '/' + s + '_' + Sanitize.file(req.body.file) + '.txt', 'utf-8', function (e, d) {
              if (e) {
                console.log('view log error: ', e)
                log(s, m + 'false')
                o.status = 'failed to retrieve log of ' + req.body.file
                res.status(400).json(o)
              } else {
                log(s, m + 'true')
                res.json({ log: d })
              }
            })
          } else {
            o.status = 'logging is disabled'
            res.status(400).json(o)
          }
          break
        default:
          console.log('operation of uncaught type: ' + type)
          o.status = 'unknown operation type'
          res.status(400).json(o)
      }
    }
  } else {
    log('sessions', 'rejected operation attempt from ' + req.ip)
    res.status(403).json({ status: 'not authorized' })
  }
})
app.get('/get_missed', function (req, res) {
  var id = req.signedCookies.id, name, type = 'none',
    check = { valid: false, expired: false, pass: false }
  if (id) {
    check.session = sessions.hasOwnProperty(id)
    if (check.session) {
      check.valid = sessions[id].verified
      check.expired = sessions[id].expires < Date.now()
      check.pass = check.valid && !check.expired
      if (check.pass) {
        name = sessions[id].access.username
        res.render('missed_notifications', {
          title: "get missed notifications", //page title
          action: "/get_missed", //post action for the form
          fields: [
            { name: 'userid', type: 'text' }
           
          ],
          query: false
        });

      }
    }
  }
});

app.post('/get_missed', urlencodedParser, function (req, res) {
  var id = req.signedCookies.id,
  check = { valid: false, expired: false, pass: false };
  if (id) {
    check.session = sessions.hasOwnProperty(id)
    if (check.session) {
      check.valid = sessions[id].verified
      check.expired = sessions[id].expires < Date.now()
      check.pass = check.valid && !check.expired
      if (check.pass) {
          var userid = req.body.userid;
          // var phonenumber = req.body.phonenumber;
          params = {
            TableName: "missed_notifications",
            KeyConditionExpression: ' userid = :id',
            ExpressionAttributeValues: {
              ':id': userid
            }
          };
          ddb.query(params, function (err, data) {
            if (err) {
              console.log(err);
              res.render("missed_notifications", {
                title: "get missed notifications", //page title
                action: "/get_missed", //post action for the form
                fields: [
                  { name: 'userid', type: 'text', property: 'required' },   //first field for the form
                ],
                query: "No user found"
              })
            }
            else {
              console.log('success');
              data.Items.forEach(function (item) {
                // queried_user = item.userid;
                // queried_phonenumber = item.phonenumber;
                queried_date = item.date;

                queried_reason = item.reason;
                queried_time = item.time;
                var arrays = [queried_date, queried_time, queried_reason]

                var zipped = zip(arrays);
                // console.log(zipped);
                // res.send({"status": 200});
                res.render("missed_notifications", {
                  title: "get missed notifications", //page title
                  action: "/get_missed", //post action for the form
                  fields: [
                    { name: 'userid', type: 'text', property: 'required' },   //first field for the form
                  ],
                  query: zipped
                })
              })
            }
          });
          // console.log(user);
          function zip(arrays) {
            return arrays[0].map(function (_, i) {
              return arrays.map(function (array) { return array[i] })
            });
          }
      }
    }
  }
  res.redirect("/signin");
});
app.listen(process.env.PORT, function (req) {
  console.log('listening on port ' + process.env.PORT)
})

module.exports = app
