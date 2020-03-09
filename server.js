'use strict'
var express = require('express'), app = express(), aws = require('aws-sdk'),
    crypto = require('crypto'), jwt = require('jsonwebtoken'), pem = require('jwk-to-pem'),
    fs = require('fs'), http = require('https'), Sanitize = require('./docs/sanitize.js'), date_formatter = Intl.DateTimeFormat('en-us',
    {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: 'numeric'}),
    ddb, database, users, message, studies = {'demo': {dbcopy: {Items: []}, participants: {}, protocols: {}, users: {}}},
    keys = [], sessions = {}, beeps = {}, cookie_options = {
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

fs.mkdir('logs', function(e){})

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
  fs.appendFile('logs/' + s + '_' + date[0].replace(/\//g, '') + '.txt', date[1] + ': ' + entry + '\n', function(e){if(e) console.log(e)})
  // console.log(s + '_' + date[0].replace(/\//g, '') + '.txt - ' + date[1] + ': ' + entry)
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
function update_status(s, id, day, index, status){
  status = parseInt(status)
  if(time_exists(s, id, day, index)) database.update({
    TableName: s,
    Key: {id: id},
    UpdateExpression: 'SET schedule[' + day + '].statuses[' + index + '] = :v',
    ExpressionAttributeValues: {':v': status}
  }, function(e, d){
    var m = 'update status of ' + id + '[' + day + '][' + index + ']: '
    if(e){
      console.log(s, e)
      m += 'false'
    }else{
      studies[s].participants[id].schedule[day].statuses[index] = status
      studies[s].version = Date.now()
      m += 'true'
    }
    log(s, m)
  })
}
function update_multi_status(s, id, day){
  if(time_exists(s, id, day, 0)) database.update({
    TableName: s,
    Key: {id: id},
    UpdateExpression: 'SET schedule[' + day + '].statuses = :v',
    ExpressionAttributeValues: {':v': studies[s].participants[id].schedule[day].statuses}
  }, function(e, d){
    var m = 'update statuses of ' + id + '[' + day + ']: '
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
    if(ds.statuses[index] === status - 1 && (status === 2 || (status === 3 && pr.reminder_message))){
      ds.statuses[index] += .1
      message.publish({
        Message: pr[status === 3 ? 'reminder_message' : 'initial_message'] + ' ' +
          (status !== 3 || pr.reminder_link ? pr.link.replace(/^http[s:/]+/, '') +
          (/\?/.test(pr.link) ? '&' : '?') + pr.id_parameter + '=' + id : ''),
        PhoneNumber: '+1' + p.phone
      }, function(e, d){
        var m = 'send ' + (status === 3 ? 'reminder' : 'initial') + ' text to ' + id + '[' + day + '][' + index + ']: ', t
        if(e){
          console.log(e)
          m += 'false'
          ds.statuses[index] = Math.floor(ds.statuses[index])
        }else{
          console.log(s, 'Beep sent to ' + id + ' at ' + new Date().toLocaleString())
          ds.statuses[index]++
          m += 'true'
          if(status === 2 && pr.remind_after){
            beeps['' + s + id + day + index] = setTimeout(function(){
              send_message(this.s, this.id, this.day, this.index, 3)
            }.bind({s: s, day: day, id: id, index: index}),
              (ds.times[index] + pr.remind_after * 6e4) - Date.now())
            m += '; reminder scheduled'
          }
          update_status(s, id, day, index, status)
        }
        log(s, m)
      })
    }
  }
}
function schedule(s, id, day){
  var d = studies[s].participants[id].schedule[day], t, n = Date.now(), m, i, updated = false, any = false
  if(!d){
    studies[s].participants[id].schedule.splice(day, 1)
  }else if(d.times){
    for(i = d.times.length; i--;){
      t = parseInt(d.times[i])
      if(d.statuses[i] === 1 && t - n < 6e8){
        if(t > n){
          any = true
          beeps['' + s + id + day + i] = setTimeout(function(){
            send_message(this.s, this.id, this.day, this.index, 2)
          }.bind({s: s, id: id, day: day, index: i}), t - Date.now())
        }else{
          updated = true
          statuses[i] = 0
        }
      }
    }
    if(update){
      studies[s].version = Date.now()
      update_multi_status(s, id, day)
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

app.get('/session', function(req, res){
  var r = {signedin: false, expires: Date.now() + 36e5}
  if(req.signedCookies.id && sessions.hasOwnProperty(req.signedCookies.id)){
    sessions[req.signedCookies.id].expires = r.expires
    r.signedin = true
  }
  res.json(r)
})

app.post('/checkin', function(req, res){
  var r = {available: false, days: 0, day: 0, beeps: 0, beep: 0}, td = new Date().setHours(0, 0, 0, 0),
      pd = td - 864e5, pdm, n = Date.now(), id = Sanitize.gen('id', req.body.id),
      k, s, p, pp, d, pr, i, t, sid, m, day
  if(id){
    for(k in studies) if(studies.hasOwnProperty(k) && studies[k].participants.hasOwnProperty(id)) s = k
    if(s){
      m = 'checkin by ' + id + ', day: '
      for(p = studies[s].participants[id], d = p.schedule.length; d--;){
        day = new Date(p.schedule[d].date).setHours(0, 0, 0, 0)
        console.log('checkin day: ', pd, day, p.schedule[d].date, td)
        if(td === day || (pdm = pd === day)){
          r.days = p.schedule.length
          r.day = d + 1
          m += r.day + ', times: '
          for(pp = p.schedule[d], pr = studies[s].protocols[pp.protocol], i = pp.times.length; i--;){
            t = pp.times[i]
            m += i
            if(t < n && (!pr.close_after || t + pr.close_after * 6e4 > n)){
              r.available = true
              r.beeps = pp.times.length
              r.beep = i + 1
              m += ', available'
              if(pr.reminder_message && pp.statuses[i] < 4){
                pp.statuses[i] = pp.statuses[i] === 3 ? 5 : 4
                if(beeps.hasOwnProperty(sid = '' + s + id + d + i)){
                  clearTimeout(beeps[sid])
                  delete beeps[sid]
                  log(s, 'reminder canceled for ' + id + '[' + i + ']')
                }
                update_status(s, id, d, i, pp.statuses[i])
              }
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
        check.perms = studies.hasOwnProperty(s) && studies[s].users.hasOwnProperty(name)
          ? studies[s].users[name] : Sanitize.perms_template(process.env.ADMIN === name)
        check.pass = base_parmissions.hasOwnProperty(type) || (check.perms.hasOwnProperty(type) && check.perms[type])
      }
      if(s && !studies.hasOwnProperty(s)) s = s.replace(/[^a-z0-9]+/gi, '_')
    }
  }
  o = {version: studies[s].version}
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
              o.status = 'failed to add study ' + s
              log(s, m + 'false')
            }else{
              o.status = exists ? 'study ' + s + ' already exists' : 'added study ' + s
              update_studies(m, s, name, req.body.protocols)
            }
            res.json(o)
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
          res.json(o)
      }
    }else{
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
                res.json(o)
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
              res.json(o)
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
              res.json({id: nid, schedule: req.body.object.schedule})
              studies[s].version = o.version = Date.now()
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
              res.json(o)
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
              o.status = (studies[s].protocols.hasOwnProperty(nid) ? 'updated' : 'added') + ' protocol ' + nid
              studies[s].protocols[nid] = req.body.object
              studies[s].version = o.version = Date.now()
            }
            if(e){
              console.log(e)
              o.status = 'failed to ' + (studies[s].protocols.hasOwnProperty(nid) ? 'update' : 'add') + ' protocol ' + nid
            }
            log(s, m + (e ? 'false' : 'true'))
            res.json(o)
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
              o.status = 'failed to remove protocol ' + nid
            }else{
              delete studies[s].protocols[nid]
              o.status = 'removed protocol "' + nid + '".'
              studies[s].version = o.version = Date.now()
            }
            log(s, m + (e ? 'false' : 'true'))
            res.json(o)
          })
          break
        case 'add_user':
          m = (studies[s].users.hasOwnProperty(nid) ? 'update' : 'add') + ' user ' + nid + ': '
          if(!nid){
            log(s, m + 'false')
            o.status
            res.json(o)
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
                log(s, m + 'false')
                console.log(e)
                o.status = /already exists/.test(e.message) ? 'user ' + nid + ' already exists'
                  : 'failed to ' + (studies[s].user.hasOwnProperty(nid) ? 'update' : 'add') + ' user'
                res.json(o)
              }else{
                var username = d.User.Username, k
                req.body.object = Sanitize.user(req.body.object)
                for(k in req.body.object) if(req.body.object.hasOwnProperty(k) && 'boolean' === typeof req.body.object[k])
                  req.body.object[k] = req.body.object[k] && studies[s].users[name].hasOwnProperty(k) && studies[s].users[name][k]
                database.update({
                  TableName: 'studies',
                  Key: {study: s},
                  UpdateExpression: 'SET #u.#n = :p',
                  ExpressionAttributeNames: {'#u': 'users', '#n': username},
                  ExpressionAttributeValues: {':p': req.body.object}
                }, function(e, d){
                  if(d){
                    studies[s].users[username] = req.body.object
                    studies[s].version = o.version = Date.now()
                  }
                  if(e) console.log(e)
                  log(s, m + 'true, ' + (e ? 'not ' : '') + 'added to database')
                  o.status = 'added user ' + nid + ', and sent them a temporary password'
                  res.json(o)
                })
              }
            })
          }
          break
        case 'remove_user':
          m = 'remove user ' + nid + ': '
          if(studies[s].users.hasOwnProperty(nid)){
            users.adminDeleteUser({
              UserPoolId: process.env.USERPOOL,
              Username: nid
            }, function(e, d){
              if(e && !/does not exist/.test(e.message)){
                log(s, m + 'false')
                o.status = 'failed to remove user ' + uid
                res.json(o)
              }else{
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
                  log(s, m + 'true, ' + (e ? 'not ' : '') + 'removed from database')
                  o.status = 'removed user ' + nid
                  res.json(o)
                })
              }
            })
          }else{
            o.status += 'no user with that email exists'
            log(s, m + 'false')
            res.json(o)
          }
          break
        case 'list_logs':
          m = 'list logs: '
          fs.readdir('logs', function(e, d){
            if(e){
              console.log(e)
              log(s, m + 'false')
              o.status = 'failed to retrieve list of logs'
              res.json(o)
            }else{
              for(var n = d.length, i = 0, sl = new RegExp('^' + s + '_'), r = /[0-9]{6}/; i < n; i++)
                if(sl.test(d[i])) o[d[i].match(r)[0]] = ''
              log(s, m + 'true')
              res.json(o)
            }
          })
          // o.status = 'local logging is currently disabled'
          // res.json(o)
          break
        case 'view_log':
          m = 'retrieve log of ' + req.body.file + ': '
          fs.readFile('logs/' + s + '_' + Sanitize.file(req.body.file) + '.txt', 'utf-8', function(e, d){
            if(e){
              console.log(e)
              log(s, m + 'false')
              o.status = 'failed to retrieve log of ' + req.body.file
              res.json(o)
            }else{
              log(s, m + 'true')
              res.json({log: d})
            }
          })
          // o.status = 'local logging is currently disabled'
          // res.json(o)
          break
        default:
          console.log('operation of uncaught type: ' + type)
          o.status = 'unknown operation type'
          res.json(o)
      }
    }
  }else{
    log('sessions', 'rejected operation attempt from ' + req.ip)
    res.json({status: 'not authorized'})
  }
})

app.listen(process.env.PORT, function(req){
  console.log('listening on port ' + process.env.PORT)
})

module.exports = app
