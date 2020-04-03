'use strict'
var express = require('express'), app = express(), aws = require('aws-sdk'),
    crypto = require('crypto'), jwt = require('jsonwebtoken'), pem = require('jwk-to-pem'),
    fs = require('fs'), http = require('https'), Sanitize = require('./docs/sanitize.js'), date_formatter = Intl.DateTimeFormat('en-us',
    {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: 'numeric'}),
    ddb, database, users, message, patterns = {colon: /:/g},
    studies = {'demo': {dbcopy: {Items: []}, participants: {}, protocols: {}, users: {}}},
    keys = [], sessions = {}, beeps = {}, logs = {enabled: true, dir: 'var/log/scheduler'}, cookie_options = {
      signed: true,
      secure: true,
      httpOnly: true,
      secret: crypto.randomBytes(36).toString('hex')
    }, base_parmissions = {
      'load_schedule': true,
      'rescan': true,
      'list_logs': true,
      'list_studies': true
    }
if(logs.enabled) try{
  fs.mkdir(logs.dir, {recursive: true}, function(e){})
}catch(e){
  console.log('failed to create logs directory, so disabled logging')
  logs.enabled = false
}
app.use(require('body-parser').json())
app.use(require('cookie-parser')(cookie_options.secret))
app.use(express.static('./docs'))
message = new aws.SNS({region: process.env.REGION})
ddb = new aws.DynamoDB({region: process.env.REGION})
database = new aws.DynamoDB.DocumentClient({region: process.env.REGION})
users = new aws.CognitoIdentityServiceProvider({region: process.env.REGION})
process.env.ISSUER = 'https://cognito-idp.' + process.env.REGION + '.amazonaws.com/' + process.env.USERPOOL
http.get(process.env.ISSUER + '/.well-known/jwks.json', function(res){
  res.on('data', function(d){keys.push(d)})
  res.on('end', function(){keys = JSON.parse(keys.join('')).keys})
}).end()
function verify_jwt(token){
  var i = keys.length, r, t = jwt.decode(token, {complete: true}), p
  if(t && t.header.alg === 'RS256'){
    p = t.payload
    if(p.exp > Date.now() / 1e3 && p.token_use === 'access' && p.iss === process.env.ISSUER && p.client_id === process.env.CLIENT){
      for(; i--;) if(keys[i].kid === t.header.kid) break
      if(i !== -1) r = jwt.verify(token, pem(keys[i]))
    }
  }
  return r
}
function log(s, entry){
  var date = date_formatter.format(new Date()).split(', ')
  if(logs.enabled){
    fs.appendFile(logs.dir + '/' + s + '_' + date[0].replace(/\//g, '') + '.txt', date[1] + ': ' + entry + '\n', function(e){if(e) console.log(e)})
  }else console.log(s + '_' + date[0].replace(/\//g, '') + '.txt - ' + date[1] + ': ' + entry)
}
function update_studies(m, s, name, protocols){
  if(!studies.hasOwnProperty(s)){
    var p = {}, k
    for(k in protocols) if(protocols.hasOwnProperty(k)) p[k] = Sanitize.protocol(protocols[k])
    studies[s] = {dbcopy: {Items: []}, participants: {}, protocols: p, users: {}}
    studies[s].users[name] = Sanitize.perms_template(true)
    if(name !== process.env.ADMIN) studies[s].users[process.env.ADMIN] = Sanitize.perms_template(true)
  }
  database.put({
    TableName: 'studies',
    Item: {study: s, protocols: studies[s].protocols, users: studies[s].users}
  }, function(e, d){
    if(e){
      console.log(e)
      log(s, m + 'false')
    }else{
      log(s, m + 'true')
    }
  })
}
function time_exists(s, id, day, index){
  return studies.hasOwnProperty(s) && studies[s].participants.hasOwnProperty(id) &&
    studies[s].participants[id].hasOwnProperty('schedule') &&
    studies[s].participants[id].schedule.length > day &&
    studies[s].participants[id].schedule[day].hasOwnProperty('times') &&
    studies[s].participants[id].schedule[day].hasOwnProperty('statuses') &&
    studies[s].participants[id].schedule[day].times.length > index &&
    studies[s].participants[id].schedule[day].statuses.length > index
}
function update_status(s, id, day, index, status, first){
  var l = 'schedule[' + day + '].', n = 0
  if(time_exists(s, id, day, index)){
    status = status ? parseInt(status) : studies[s].participants[id].schedule[day].statuses[index]
    first = first || studies[s].participants[id].schedule[day].accessed_first[index]
    n = studies[s].participants[id].schedule[day].accessed_n[index]
    if(first) n++
    database.update({
      TableName: s,
      Key: {id: id},
      UpdateExpression: 'SET ' + l + 'statuses[' + index + '] = :s, ' + l + 'accessed_first[' + index + '] = :f, '
        + l + 'accessed_n[' + index + '] = :n',
      ExpressionAttributeValues: {':s': status, ':f': first, ':n': n}
    }, function(e, d){
      var m = 'update status of ' + id + '[' + day + '][' + index + ']: '
      if(e){
        console.log(s, e)
        m += 'false'
      }else{
        studies[s].participants[id].schedule[day].statuses[index] = status
        if(first) studies[s].participants[id].schedule[day].accessed_first[index] = first
        studies[s].participants[id].schedule[day].accessed_n[index] = n
        studies[s].version = Date.now()
        m += 'true'
      }
      log(s, m)
    })
  }
}
function update_day(s, id, day){
  if(time_exists(s, id, day, 0)) database.update({
    TableName: s,
    Key: {id: id},
    UpdateExpression: 'SET schedule[' + day + '] = :v',
    ExpressionAttributeValues: {':v': studies[s].participants[id].schedule[day]}
  }, function(e, d){
    var m = 'update day ' + day + ' of ' + id + ': '
    if(e){
      console.log(s, e)
      m += 'false'
    }else{
      m += 'true'
    }
    log(s, m)
  })
}
function send_message(s, id, day, index, status){
  if(time_exists(s, id, day, index)){
    var p = studies[s].participants[id], ds = p.schedule[day], pr = studies[s].protocols[ds.protocol]
    if(ds.statuses[index] === 6){
      update_status(s, id, day, index, 7)
    }else if(ds.statuses[index] === status - 1 && (status === 2 || (status === 3 && pr.reminder_message))){
      ds.statuses[index] += .1
      message.publish({
        Message: pr[status === 3 ? 'reminder_message' : 'initial_message'] + ' ' +
          (status !== 3 || pr.reminder_link ? pr.link.replace(/^http[s:/]+/, '') +
          (/\?/.test(pr.link) ? '&' : '?') + pr.id_parameter + '=' + id : ''),
        PhoneNumber: '+1' + p.phone
      }, function(e, d){
        var m = 'send ' + (status === 3 ? 'reminder' : 'initial') + ' text to ' + id + '[' + day + '][' + index + ']: ', t,
            now = Date.now()
        if(e){
          console.log(e)
          m += 'false'
          ds.statuses[index] = Math.floor(ds.statuses[index])
        }else{
          console.log(s, 'Beep sent to ' + id + ' at ' + new Date().toString())
          ds.statuses[index]++
          m += 'true'
          if(status === 2 && ds.accessed_n[index] === 0 && pr.remind_after && ds.times[index] + pr.remind_after * 6e4 > now){
            beeps['' + s + id + day + index] = setTimeout(send_message.bind(null, s, id, day, index, 3), (ds.times[index] + pr.remind_after * 6e4) - now)
            m += '; reminder scheduled'
          }
          update_status(s, id, day, index, status, 0)
        }
        log(s, m)
      })
    }
  }
}
function timeadj(d, e){
  var p = e.split(patterns.colon)
  return d.date + parseInt(p[0]) * 36e5 + parseInt(p[1]) * 6e4 + (p.length === 3 ? parseInt(p[2]) * 1e3 : 0)
}
function schedule(s, id, day){
  var d = studies[s].participants[id].schedule[day], pr = studies[s].protocols[d.protocol],
      t, minsep, remind, end, n, now = Date.now(), m, i, updated = false, any = false
  if(!d){
    studies[s].participants[id].schedule.splice(day, 1)
  }else if(d.hasOwnProperty('times')){
    minsep = pr.minsep * 6e4
    remind = pr.remind_after * 6e4 || 0
    end = timeadj(d, studies[s].participants[id].end_time) + studies[s].participants[id].timezone * 36e4
    for(n = d.times.length, i = 0; i < n; i++){
      t = d.times[i]
      if(t - now < 6e8 && (d.statuses[i] === 6 || d.statuses[i] === 1 || (d.statuses[i] === 2 && pr.remind_after && t + remind < now))){
        if(d.statuses[i] === 6){
          if(t < now){
            updated = true
            d.statuses[i] = 7
          }else setTimeout(send_message.bind(null, s, id, day, i, 7), t - Date.now())
        }else if(t > now || (now < (i === n - 1 ? end : d.times[i + 1] - minsep) && (!pr.close_after || t + pr.close_after * 6e4 > now))){
          any = true
          beeps['' + s + id + day + i] = setTimeout(send_message.bind(null, s, id, day, i, d.statuses[i] === 1 ? 2 : 3), t - Date.now())
        }else if(d.statuses[i] === 1){
          updated = true
          d.statuses[i] = 0
        }
      }
    }
    if(!d.hasOwnProperty('accessed_first') || !d.hasOwnProperty('accessed_n')){
      updated = true
      d.accessed_first = []
      d.accessed_n = []
      for(; n--;){
        d.accessed_first.push(0)
        d.accessed_n.push(0)
      }
    }
    if(updated){
      studies[s].version = Date.now()
      update_day(s, id, day)
    }
  }
  return any
}
function clear_schedule(s, id){
  var p = studies[s].participants[id].schedule, d, i, sid = ''
  for(d = p.length; d--;) for(i = p[d].times.length; i--;) if('undefined' !== beeps[sid = '' + s + id + d + i]){
    clearTimeout(beeps[sid])
    delete beeps[sid]
  }
}
function scan_database(s){
  database.scan({TableName: s, Select: 'ALL_ATTRIBUTES'}, function(e, d){
    var i, m = 'download ' + s + ' participants database: ', day, any, anyany
    if(e){
      console.log(e)
      log(s, m + 'false')
    }else{
      log(s, m + 'true')
      studies[s].version = Date.now()
      studies[s].participants = {}
      for(i = d.Items.length, day; i--;){
        studies[s].participants[d.Items[i].id] = d.Items[i]
        for(day = d.Items[i].schedule.length, any = false; day--;) any = schedule(s, d.Items[i].id, day) || any
        if(any){
          anyany = true
          log(s, 'scheduled texts for ' + d.Items[i].id)
        }
      }
      if(anyany) setTimeout(scan_database.bind(null, s), 59e7)
      studies[s].dbcopy = d
    }
  })
}
function scan_studies(){
  database.scan({TableName: 'studies', Select: 'ALL_ATTRIBUTES'}, function(e, d){
    var i, m = 'download studies database: '
    if(e){
      if(e.statusCode && e.statusCode === 400){
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
          ProvisionedThroughput:{
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
          BillingMode: 'PROVISIONED'
        }, function(e, d){
          if(e){
            log('sessions', m + 'false, and failed to create')
          }else{
            log('sessions', m + 'true')
          }
        })
      }else{
        console.log(e)
        log('sessions', m + 'false')
      }
    }else{
      if(d.Items.length){
        log('sessions', m + 'true')
        for(i = d.Items.length; i--;){
          if(studies.hasOwnProperty(d.Items[i].study)){
            studies[d.Items[i].study].users = d.Items[i].users
            studies[d.Items[i].study].protocols = d.Items[i].protocols
          }else studies[d.Items[i].study] = {
            dbcopy: {Items: []},
            participants: {},
            users: d.Items[i].users,
            protocols: d.Items[i].protocols
          }
          scan_database(d.Items[i].study)
        }
      }
    }
  })
}
scan_studies()
function add_user(o, m, s, base_perms, email, username, req, res){
  req.body.object = Sanitize.user(req.body.object)
  for(var k in req.body.object) if(req.body.object.hasOwnProperty(k) && 'boolean' === typeof req.body.object[k])
    req.body.object[k] = req.body.object[k] && base_perms.hasOwnProperty(k) && base_perms[k]
  database.update({
    TableName: 'studies',
    Key: {study: s},
    UpdateExpression: 'SET #u.#n = :p',
    ExpressionAttributeNames: {'#u': 'users', '#n': username},
    ExpressionAttributeValues: {':p': req.body.object}
  }, function(e, d){
    if(e){
      m += 'false'
      console.log(e)
      res.status(400).json(o)
    }else{
      if(studies[s].users.hasOwnProperty(username)){
        m += 'true'
        o.status = 'updated user ' + email
      }else{
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
app.get('/session', function(req, res){
  var r = {signedin: false, expires: Date.now() + 36e5}
  if(req.signedCookies.id && sessions.hasOwnProperty(req.signedCookies.id)){
    sessions[req.signedCookies.id].expires = r.expires
    r.signedin = true
  }
  res.json(r)
})
app.post('/checkin', function(req, res){
  var r = {available: false, accessed: 0, days: 0, day: 0, beeps: 0, beep: 0}, td = new Date().setHours(0, 0, 0, 0),
      pd = td - 864e5, pdm, n = Date.now(), id = Sanitize.gen('id', req.body.id),
      k, s, p, pp, d, pr, i, t, sid, m, day, status
  if(id){
    for(k in studies) if(studies.hasOwnProperty(k) && studies[k].participants.hasOwnProperty(id)) s = k
    if(s){
      m = 'checkin by ' + id + ', day: '
      for(p = studies[s].participants[id], d = p.schedule.length; d--;){
        day = new Date(p.schedule[d].date).setHours(0, 0, 0, 0)
        if(td === day || (pdm = pd === day)){
          r.days = p.schedule.length
          r.day = d + 1
          m += r.day + ', beep: '
          for(pp = p.schedule[d], pr = studies[s].protocols[pp.protocol], i = pp.times.length; i--;){
            t = pp.times[i]
            if(t < n && (!pr.close_after || t + pr.close_after * 6e4 > n)){
              status = pp.statuses[i]
              r.accessed = pp.accessed_n[i]
              r.available = pr.accesses ? r.accessed < pr.accesses : true
              r.beeps = pp.times.length
              r.beep = i + 1
              m += i + ', ' + (r.available ? '' : 'not ') + 'available'
              if(pr.reminder_message && status < 4){
                status = status === 3 ? 5 : 4
                if(beeps.hasOwnProperty(sid = '' + s + id + d + i)){
                  clearTimeout(beeps[sid])
                  delete beeps[sid]
                  log(s, 'reminder canceled for ' + id + '[' + d + '][' + i + ']')
                }
              }
              update_status(s, id, d, i, status, r.accessed === 0 ? n : 0)
              break
            }
          }
          if(pdm || r.available) break
        }
      }
      log(s, m)
    }
  }
  res.json(r)
})
app.get('/signin', function(req, res){
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
app.get('/signout', function(req, res){
  var id = req.signedCookies.id
  if(id && sessions.hasOwnProperty(id)){
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
app.get('/auth', function(req, res){
  if(req.query && req.query.code && req.query.state && req.signedCookies.id && req.query.state === req.signedCookies.id){
    var body = 'grant_type=authorization_code&redirect_uri=' + process.env.REDIRECT + '&client_id=' + process.env.CLIENT + '&code=' + req.query.code,
        now = Date.now(), id = crypto.randomBytes(36).toString('hex'), k, token
    for(k in sessions) if(sessions.hasOwnProperty(k) && sessions[k].expires < now){
      log('sessions', 'session removed: ' + k)
      delete sessions[k]
    }
    while(sessions.hasOwnProperty(id)) id = crypto.randomBytes(36).toString('hex')
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
    }, function(r){
      var data = []
      r.on('data', function(d){data.push(d)})
      r.on('end', function(){
        data = JSON.parse(data.join(''))
        sessions[id] = {
          expires: now + 36e5,
          tokens: data,
          access: verify_jwt(data.access_token)
        }
        if(sessions[id].access){
          sessions[id].verified = true
          log('sessions', 'session established from ' + req.ip + ' (' + sessions[id].access.username + ')')
        }
        res.redirect('/')
      })
    })
    token.on('error', function(e){console.log('token error: ', e)})
    token.write(body)
    token.end()
  }else{
    log('sessions', 'invalid auth attempt from ' + req.ip)
    res.redirect('/')
  }
})
app.post('/operation', function(req, res){
  var id = req.signedCookies.id, nid = Sanitize.gen('id', req.body.id), name, type = 'none',
      check = {valid: false, expired: false, pass: false}, s = Sanitize.gen('study', req.body.study), o, m
  if(id){
    if(req.body.hasOwnProperty('type')) type = Sanitize.gen('type', req.body.type)
    check.session = sessions.hasOwnProperty(id)
    if(check.session){
      check.valid = sessions[id].verified
      check.expired = sessions[id].expires < Date.now()
      check.pass = check.valid && !check.expired
      if(check.pass){
        name = sessions[id].access.username
        if(!studies.hasOwnProperty(s) && process.env.ADMIN !== name){
          check.perms = Sanitize.perms_template(false)
          for(m in studies) if(studies.hasOwnProperty(m) && studies[m].users.hasOwnProperty(name) &&
            studies[m].users[name].add_study) check.perms.add_study = true
        }else{
          check.perms = studies.hasOwnProperty(s) && studies[s].users.hasOwnProperty(name)
            ? studies[s].users[name] : Sanitize.perms_template(process.env.ADMIN === name)
        }
        check.pass = base_parmissions.hasOwnProperty(type) || (check.perms.hasOwnProperty(type) && check.perms[type])
      }
      if(s && !studies.hasOwnProperty(s)) s = s.replace(/[^a-z0-9._-]+/gi, '_')
    }
  }
  o = {version: 0}
  if(check.pass){
    if(!studies.hasOwnProperty(s)){
      switch(type){
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
            ProvisionedThroughput:{
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            BillingMode: 'PROVISIONED'
          }, function(e, d){
            var exists = false
            if(e && (!e.message || !(exists = /already exists/.test(e.message)))){
              console.log(e)
              m += 'false'
              o.status = 'failed to add study ' + s
              res.status(400).json(o)
            }else{
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
          for(s in studies) if(studies.hasOwnProperty(s)){
            for(u in studies[s].users) if(name === u){
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
    }else{
      o.version = studies[s].version
      switch(type){
        case 'load_schedule':
          req.body.version = parseInt(req.body.version)
          if(req.body.version && req.body.version === studies[s].version){
            o.status = 'study is up-to-date'
            res.json(o)
            break
          }
          var k, r = {version: studies[s].version, participants: {}, protocols: studies[s].protocols, users: {}}
          if(check.perms.view_participant){
            r.participants = studies[s].participants
          }else for(k in studies[s].participants) if(studies[s].participants.hasOwnProperty(k)){
            r.participants[k] = {schedule: studies[s].participants[k].schedule}
          }
          if(check.perms.view_user) r.users = studies[s].users
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
          }, function(e, d){
            m += e ? 'false' : 'true'
            database.delete({
              TableName: 'studies',
              Key: {study: s}
            }, function(e, d){
              if(e){
                console.log(e)
                log(s, m + ', failed to remove from database')
                o.status = /does not exists/.test(e.message) ? 'study ' + s + ' does not exist' : 'failed to remove study ' + s
                res.status(400).json(o)
              }else{
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
          if(existing) clear_schedule(s, nid)
          req.body.object = Sanitize.participant(req.body.object)
          database.put({
            TableName: s,
            Item: req.body.object
          }, function(e, d){
            if(e){
              console.log(e)
              log(s, m + 'false')
              o.status = 'failed to add participant ' + nid
              res.status(400).json(o)
            }else{
              log(s, m + 'true')
              if(existing){
                for(var i = studies[s].dbcopy.Items.length; i--;){
                  if(studies[s].dbcopy.Items[i] === nid){
                    studies[s].dbcopy.Items[i] = req.body.object
                    break
                  }
                }
              }else{
                studies[s].dbcopy.Items.push(req.body.object)
              }
              studies[s].participants[nid] = req.body.object
              for(var day = req.body.object.schedule.length; day--;) schedule(s, nid, day)
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
            Key: {id: nid}
          }, function(e, d){
            if(e){
              console.log(e)
              log(s, m + 'false')
              o.status = /does not exists/.test(e.message) ? 'participant ' + nid + ' does not exist' : 'failed to remove participant ' + nid
              res.status(400).json(o)
            }else{
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
            Key: {study: s},
            UpdateExpression: 'SET #p.#n = :p',
            ExpressionAttributeNames: {'#p': 'protocols', '#n': nid},
            ExpressionAttributeValues: {':p': req.body.object}
          }, function(e, d){
            if(d){
              m += 'true'
              o.status = (studies[s].protocols.hasOwnProperty(nid) ? 'updated' : 'added') + ' protocol ' + nid
              studies[s].protocols[nid] = req.body.object
              studies[s].version = o.version = Date.now()
              res.json(o)
            }
            if(e){
              m += 'false'
              console.log(e)
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
            Key: {study: s},
            UpdateExpression: 'REMOVE #p.#n',
            ExpressionAttributeNames: {'#p': 'protocols', '#n': nid}
          }, function(e, d){
            if(e){
              console.log(e)
              m += 'false'
              o.status = 'failed to remove protocol ' + nid
              res.status(400).json(o)
            }else{
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
          for(k in studies[s].users) if(studies[s].users.hasOwnProperty(k) && studies[s].users[k].email === email){
            nid = k
            break
          }
          if(email !== nid){
            m = 'update user ' + email + ': '
            add_user(o, m, s, studies[s].users[name], email, nid, req, res)
          }else{
            m = 'add user ' + email + ': '
            if(!nid){
              log(s, m + 'false')
              o.status = 'no email provided'
              res.status(400).json(o)
            }else{
              users.adminCreateUser({
                UserPoolId: process.env.USERPOOL,
                Username: nid,
                UserAttributes: [{
                  Name: 'email',
                  Value: nid
                }]
              }, function(e, d){
                if(e){
                  if(e.message && /already exists/.test(e.message)){
                    m = 'user ' + nid + ' exists but is not in database, so adding them: '
                    users.adminGetUser({
                      UserPoolId: process.env.USERPOOL,
                      Username: nid
                    }, function(e, d){
                      if(e){
                        log(s, m + 'false')
                        o.status = 'failed to retrieve user; try removing them from Cognito manually and readding'
                        res.status(400).json(o)
                      }else add_user(o, m, s, studies[s].users[name], nid, d.Username, req, res)
                    })
                  }else{
                    log(s, m + 'false')
                    o.status = 'failed to ' + (studies[s].users.hasOwnProperty(nid) ? 'update' : 'add') + ' user'
                    res.status(400).json(o)
                  }
                }else add_user(o, m, s, studies[s].users[name], nid, d.User.Username, req, res)
              })
            }
          }
          break
        case 'remove_user':
          m = 'remove user ' + nid + ': '
          if(studies[s].users.hasOwnProperty(nid)){
            database.update({
              TableName: 'studies',
              Key: {study: s},
              UpdateExpression: 'REMOVE #u.#n',
              ExpressionAttributeNames: {'#u': 'users', '#n': nid}
            }, function(e, d){
              if(d){
                delete studies[s].users[nid]
                for(var k in sessions) if(sessions.hasOwnProperty(k) && sessions[k].access.username === nid){
                  delete sessions[k]
                }
                studies[s].version = o.version = Date.now()
              }
              if(e) console.log(e)
              log(s, m + (e ? 'true ' : 'false '))
              e = true
              for(m in studies) if(studies.hasOwnProperty(m) && studies[m].users.hasOwnProperty(nid)) e = false
              if(e){
                users.adminDeleteUser({
                  UserPoolId: process.env.USERPOOL,
                  Username: nid
                }, function(e, d){
                  m = 'delete user ' + nid + "'s account: "
                  log(s, m + (e ? (/does not exist/.test(e.message) ? 'false, account does not exist' : 'false') : 'true'))
                })
              }
              o.status = 'removed user ' + nid
              res.json(o)
            })
          }else{
            o.status += 'no user with that email exists'
            log(s, m + 'false')
            res.status(400).json(o)
          }
          break
        case 'list_logs':
          if(logs.enabled){
            m = 'list logs: '
            fs.readdir(logs.dir, function(e, d){
              if(e){
                console.log(e)
                log(s, m + 'false')
                o.status = 'failed to retrieve list of logs'
                res.status(400).json(o)
              }else{
                for(var n = d.length, i = 0, sl = new RegExp('^' + s + '_'), r = /[0-9]{6}/; i < n; i++)
                  if(sl.test(d[i])) o[d[i].match(r)[0]] = ''
                log(s, m + 'true')
                res.json(o)
              }
            })
          }else{
            o.status = 'logging is disabled'
            res.status(400).json(o)
          }
          break
        case 'view_log':
          if(logs.enabled){
            m = 'retrieve log of ' + req.body.file + ': '
            fs.readFile(logs.dir + '/' + s + '_' + Sanitize.file(req.body.file) + '.txt', 'utf-8', function(e, d){
              if(e){
                console.log(e)
                log(s, m + 'false')
                o.status = 'failed to retrieve log of ' + req.body.file
                res.status(400).json(o)
              }else{
                log(s, m + 'true')
                res.json({log: d})
              }
            })
          }else{
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
  }else{
    log('sessions', 'rejected operation attempt from ' + req.ip)
    res.status(403).json({status: 'not authorized'})
  }
})
app.listen(process.env.PORT, function(req){
  console.log('listening on port ' + process.env.PORT)
})
module.exports = app
