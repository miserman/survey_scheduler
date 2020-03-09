'use strict'
function $(e){return document.getElementById(e)}
var session, module = {exports: {}}, Sanitize, pending = {}, page = {
  wrap: $('display_wrap'),
  study_selector: $('study_selector'),
  studies_wrap: $('studies_wrap'),
  timeline_wrap: $('timeline_wrap'),
  schedule_wrap: $('schedule_wrap'),
  selected_study: $('selected_study'),
  studies: $('studies'),
  top_menu: $('top_menu'),
  foot_menu: $('foot_menu'),
  notifications: $('notifications'),
  latest_notification: $('latest_notification'),
  side_menu: $('side_menu'),
  display_options: $('display_options'),
  signin: $('side_menu').firstElementChild,
  signin_prompt: $('signin_prompt'),
  clock: $('clock'),
  upnext: $('upnext'),
  timeline: $('timeline'),
  ids: $('schedule_ids'),
  entries: $('schedule_entries'),
  menu_timeline: $('menu_timeline'),
  menu_schedule: $('menu_schedule'),
  colors: document.createElement('style'),
  scheduler_tabs: $('scheduler_tabs').getElementsByTagName('button'),
  tick_editor: $('tick_editor'),
  tick_info: $('tick_info'),
  schedule_rows: {},
  logs: {
    frame: $('logs'),
    tabs: $('logs_tabs'),
    panes: $('logs_panes')
  },
  scheduler: {
    frame: $('scheduler'),
    menu: $('scheduler_tabs'),
    panes: $('scheduler_panes').children,
    notification: $('scheduler_notification'),
    participant: {
      list: $('participant_list'),
      id: $('participant_id'),
      options: $('participant'),
      protocol_select: $('protocol_select'),
      protocol_order: $('protocol_order'),
      protocol_fills: $('protocol_fills'),
      protocol_type: $('protocol_type'),
      daysofweek: $('daysofweek'),
      blackouts: $('blackouts'),
      pause_toggle: $('pause_toggle'),
      submit: $('participant_submit')
    },
    protocol: {
      id: $('protocol_id'),
      list: $('protocol_list'),
      options: $('protocol_options'),
      message: $('message_preview'),
      submit: $('protocol_submit')
    },
    user: {
      list: $('user_list'),
      id: $('user_id'),
      options: $('user_options'),
      submit: $('user_submit')
    }
  }
}, loading = false, queued = false, edit = {t: 0, b: 0, e: false}, update_queue = {}, schedule = {}, temp_schedule = {}, nearest,
timezone = new Date().getTimezoneOffset(), study = {participants: {}, protocols: {}, version: 0, recalls: 0},
store = window.localStorage || {}, logs = {}, patterns = {
  addRemove: /^(?:add_|remove_)/, add: /^add_/, remove: /^remove_/, noRecord: /not on record/, idPhone: /^(?:id|phone)$/, pm: /PM$/,
  d7: /\d{7}/, dashdate: /^\d{4}-\d{2}-\d{2}$/, stripdate: /\d{2}(?=\d{2}$)|[^0-9]/g, gcm: /[^\u0000-\u007f]/g, http: /(http[s:/]+(.+$))/,
  pButton: /^(?:P|BUTTON)$/, crs: /^(?:cancel|remove|set)$/, qmark: /\?/, space: /\s/g, colonspace: /[:\s]/g, apm: /[ap:]/i, colon: /:/g, p: /p/i,
  numpunct: /[^0-9:\s-]/g, mli: /(?:message$|link$|^id)/, query: /\?.*$/, cmli: /(?:color|id|message|link)/, slash: /\//g, n: /[?&][Nn]=(\d+)/
}, former = {
  time: Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit'}),
  ftime: Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit', second: 'numeric'}),
  mtime: Intl.DateTimeFormat('en-us', {hour: '2-digit', minute: '2-digit', second: 'numeric', hourCycle: 'h23'}),
  day: Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit'}),
  date: Intl.DateTimeFormat('en-us', {month: '2-digit', day: '2-digit', year: 'numeric'}),
  dashdate: function(t){var s = this.date.format(t).split(patterns.slash); return s[2] + '-' + s[0] + '-' + s[1]}
}, now = Math.floor(Date.now() / 6e4) * 6e4, options = {
  study: '',
  studies: false,
  n: 0,
  tab: 0,
  timeline_scale: 1,
  days_passed: 0,
  days_future: 0,
  participant: {
    start_day: former.dashdate(now),
    end_day: former.dashdate(now + 14 * 864e5),
    start_time: former.mtime.format(now),
    end_time: former.mtime.format(now + 54e6)
  },
  protocol: {
    signal: {
      color: '#ffcccc',
      beeps: 6,
      offset: 0,
      random_start: true,
      randomization: 'binned',
      minsep: 30,
      remind_after: 10,
      close_after: 30,
      initial_message: "Please complete this survey within 30 minutes:",
      reminder_message: "Reminder: complete your survey within 20 minutes.",
      reminder_link: false,
      link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
      id_parameter: 'id'
    },
    event: {
      color: '#83f0ff',
      beeps: 1,
      offset: 15,
      initial_message: "Please complete this survey after any study-relevant event:",
      link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
      id_parameter: 'id'
    }
  },
  user: {}
}, ticker, names = {
  status: ['missed', 'pending', 'sent', 'reminded', 'send_received', 'remind_received', 'pause'],
  tabs: ['Participant', 'Protocol', 'User'],
  types: ['participant', 'protocol', 'user'],
  order_type: ['shuffle', 'sample', 'ordered'],
  randomization: ['none', 'binned', 'independent']
}
window.onload = function(){
  if(store.hasOwnProperty('options')){
    var stored_options = JSON.parse(store.options), k, c
    for(k in stored_options) if(stored_options.hasOwnProperty(k)) options[k] = stored_options[k]
  }
  if(window.location.search && /study=[^&?]/i.test(window.location.search)){
    options.study = window.location.search.match(/study=([^&?]+)(?:&|$)/i)[1]
  }
  backup()
  apply_colors()
  page.scheduler.menu.addEventListener('click', toggle_panes)
  page.studies.addEventListener('click', study_selection)
  page.scheduler.participant.options.addEventListener('change', update_options)
  page.scheduler.participant.protocol_type.addEventListener('change', update_options)
  page.scheduler.participant.protocol_fills.addEventListener('click', fill_protocol_order)
  page.menu_schedule.addEventListener('mouseover', show_time)
  page.menu_schedule.addEventListener('mousedown', schedule_action_start)
  page.menu_schedule.addEventListener('mousemove', schedule_action_move)
  page.menu_schedule.addEventListener('mouseup', schedule_action_end)
  page.display_options.addEventListener('change', update_display_options)
  page.scheduler.protocol.options.addEventListener('change', update_protocol)
  page.scheduler.participant.protocol_select.addEventListener('click', edit_protocol_list)
  page.scheduler.participant.protocol_order.addEventListener('click', edit_protocol_list)
  page.scheduler.user.options.addEventListener('change', update_user)
  page.logs.tabs.addEventListener('click', view_log)
  page.ids.addEventListener('click', fill_existing)
  page.entries.addEventListener('click', expand_schedule)
  page.timeline.addEventListener('click', expand_tick)
  page.timeline.addEventListener('mouseover', show_hovered)
  page.timeline.addEventListener('mouseout', show_nearest)
  window.addEventListener('keyup', function(e){if(e.keyCode === 27) toggle_scheduler()})
  maintain_session()
  for(var i = names.status.length, e; i--;){
    page.tick_editor.firstElementChild.children[1].appendChild(document.createElement('option'))
    page.tick_editor.firstElementChild.children[1].lastElementChild.innerText = names.status[i]
  }
  page.tick_editor.firstElementChild.children[1].selectedIndex = 3
  page.tick_editor.addEventListener('change', schedule_action_update)
  if(options.hasOwnProperty('last')){
    options.tab = options.last === 'user' ? 2 : options.last === 'protocols' ? 1 : 0
    toggle_scheduler()
    delete options.last
    backup()
  }
  for(e = page.display_options.getElementsByTagName('input'), i = e.length; i--;){
    if(e[i].name && options.hasOwnProperty(e[i].name)) e[i].value = options[e[i].name]
  }
  Sanitize = module.exports
}
function request(path, fun, error, body){
  if(options.study === 'demo'){
    switch(path){
      case '/session':
        fun(JSON.stringify({signedin: true, expires: Date.now() + 36e5}))
        break
      case '/operation':
        if(patterns.addRemove.test(body.type)){
          var t = body.type.replace(patterns.addRemove, ''), m = t + ' ' + body.id + ' '
          if(patterns.add.test(body.type)){
            notify({status: (study[t + 's'].hasOwnProperty(body.id) ? 'updated ' : 'added ') + t + ' ' + body.id})
            m += study[t + 's'].hasOwnProperty(body.id) ? 'updated' : 'created'
            study[t + 's'][body.id] = body.object
          }else{
            m += 'removed'
            delete study[t + 's'][body.id]
          }
          fun({status: m})
          backup_demo()
        }else{
          switch(body.type){
            case 'load_schedule':
              var m = patterns.n.exec(window.location.search), now = Date.now(), n, nn, i, s, p, ra, message, k, t, e
              study = store.hasOwnProperty('study') ? JSON.parse(store.study) : {
                version: 0, recalls: 0, timezone: timezone, participants: {}, protocols: options.protocol, users: {}
              }
              if(m){
                n = parseInt(m[1])
                if(options.n !== n){
                  options.n = n
                  backup()
                  demo_study(n)
                  backup_demo()
                }
              }
              for(k in update_queue) if(update_queue.hasOwnProperty(k) && study.participants.hasOwnProperty(k) && update_queue[k].after <= now){
                s = study.participants[k].schedule[update_queue[k].day]
                if(!study.protocols.hasOwnProperty(s.protocol) || update_queue[k].code > 3 || s.statuses[update_queue[k].time] !== update_queue[k].code - 1){
                  delete update_queue[k]
                }else{
                  s.statuses[update_queue[k].time] = update_queue[k].code
                  p = study.protocols[s.protocol]
                  if(update_queue[k].code === 2 || (p.remind_after && p.reminder_message)){
                    t = update_queue[k].code === 2 ? 'initial' : 'reminder'
                    message = build_message(p[t + '_message'], false, t === 'initial' || p.reminder_link ? p.link : false, p.id_parameter, k)
                    page.latest_notification.classList.remove('showing')
                    setTimeout(addshowing, 10)
                    page.latest_notification.innerText = t + ' beep sent to participant '
                      + k + '[' + update_queue[k].day + '][' + update_queue[k].time + ']' + '; click to view'
                    if(t === 'initial' || p.reminder_link) page.latest_notification.innerText += ', and click its link to checkin'
                    page.notifications.appendChild(e = document.createElement('tr'))
                    e.appendChild(document.createElement('td'))
                    e.lastElementChild.innerText = former.ftime.format(Date.now())
                    e.appendChild(e = document.createElement('td'))
                    e.appendChild(document.createTextNode('to participant ' + k + '[' + update_queue[k].day + '][' + update_queue[k].time + ']:'))
                    e.appendChild(e = document.createElement('p'))
                    e.innerHTML = checkin_link(message, k, update_queue[k].day, update_queue[k].time)
                    page.notifications.lastElementChild.scrollIntoView()
                    if(update_queue[k].code === 2 && p.remind_after && p.reminder_message){
                      update_queue[k].after = s.times[update_queue[k].time] + p.remind_after * 6e4
                      update_queue[k].code = 3
                    }
                  }else delete update_queue[k]
                }
              }
              for(k in study.participants) if(study.participants.hasOwnProperty(k)){
                for(s = study.participants[k].schedule, p = schedule.hasOwnProperty(k) ? schedule[k].schedule : [], nn = p.length, n = s.length; n--;){
                  ra = study.protocols.hasOwnProperty(s[n].protocol) && study.protocols[s[n].protocol].hasOwnProperty('remind_after')
                    ? study.protocols[s[n].protocol].remind_after * 6e4 : 0
                  for(i = s[n].times.length; i--;) if(s[n].statuses[i] === 1 && s[n].times[i] < now){
                    s[n].statuses[i] = 0
                  }else if(!update_queue.hasOwnProperty(k) && s[n].statuses[i] === 2 && ra &&
                    s[n].times[i] < now && s[n].times[i] + ra > now){
                    update_queue[k] = {after: s[n].times[i] + ra, code: 3, day: n, time: i}
                    setTimeout(load_schedule, s[n].times[i] + ra - Date.now())
                  }
                }
              }
              schedule = study.participants
              backup_demo()
              page.selected_study.innerText = options.study
              page.study_selector.style.display = 'none'
              page.timeline_wrap.style.display = page.schedule_wrap.style.display = ''
              display_schedule()
              setTimeout(reset_loading, 10)
              break
            case 'list_studies':
              options.study = ''
              backup()
              window.location.href = window.location.href.replace(patterns.query, '')
              break
            case 'rescan':
              notify({status: "the demo's database is in local storage"})
              break
            default:
          }
        }
        break
      default:
        console.log(path, body)
        session = {signedin: true}
    }
  }else{
    var f = new XMLHttpRequest()
    f.onreadystatechange = function(){
      if(f.readyState === 4){
        if(fun && f.status === 200){
          fun(f.responseText)
        }else if(error && f.status !== 200){
          error(f.responseText)
        }
      }
    }
    if(body){
      f.open('POST', path, true)
      f.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
      f.send(JSON.stringify(body))
    }else{
      f.open('GET', path, true)
      f.send()
    }
  }
}
function maintain_session(){
  request('/session', function(r){
    session = JSON.parse(r)
    setTimeout(maintain_session, session.expires - 6e4 - Date.now())
    if(session.signedin){
      for(var k in pending){
        pending[k]()
        delete pending[k]
      }
      if(page.signin.innerText === 'sign in'){
        setTimeout(options.study ? load_schedule : select_study, 60)
        setTimeout(options.study ? load_schedule : select_study, 1e7 * options.timeline_scale)
        if(options.study) notify({status: 'study ' + options.study + ' accessed'})
        page.signin.innerText = 'sign out'
      }
    }else{
      page.signin_prompt.style.display = page.study_selector.style.display = ''
      page.studies_wrap.style.display = 'none'
    }
  })
}
function signio(){
  if(options.study === 'demo'){
    select_study()
  }else{
    window.location.pathname = session && session.signedin ? '/signout' : '/signin'
  }
}
function reload(){
  if(options.study){
    request('/operation', function(d){
      backup()
      window.location.reload()
    }, notify, {type: 'rescan', study: options.study})
  }else notify({status: 'select a study to reload its database'})
}
function load_schedule(refresh){
  if(!loading){
    loading = true
    queued = false
    request('/operation', function(r){
      var temp_study
      try{temp_study = JSON.parse(r)}catch(e){}
      if(temp_study){
        if(temp_study.hasOwnProperty('status') && page.selected_study.innerText === 'select study'){
          temp_study = study
        }
        if(temp_study.hasOwnProperty('status')){
          if(study.recalls < 6 && temp_study.status === 'study is up-to-date'){
            study.recalls++
            setTimeout(load_schedule, 2e3)
          }else study.recalls = 0
        }else{
          study = temp_study
          study.recalls = 0
          schedule = study.participants || {}
          page.selected_study.innerText = options.study
          page.study_selector.style.display = 'none'
          page.timeline_wrap.style.display = page.schedule_wrap.style.display = ''
          display_schedule(refresh)
        }
      }
      setTimeout(reset_loading, 10)
    }, function(d){
      try{d = JSON.parse(d)}catch(e){}
      if(patterns.noRecord.test(d.status)){
        options.studies.splice(options.studies.indexOf(options.study), 0)
        options.study = ''
        backup()
        select_study()
      }
      setTimeout(reset_loading, 10)
    }, {type: 'load_schedule', study: options.study, version: study.version})
  }else queued = true
}
function reset_loading(){
  loading = false
  if(queued) load_schedule()
}
function update_display_options(){
  if(!loading){
    loading = true
    for(var e = page.display_options.getElementsByTagName('input'), i = e.length; i--;){
      if(e[i].name) options[e[i].name] = parseFloat(e[i].value)
    }
    backup()
    setTimeout(function(){
      display_schedule()
      loading = false
    }, 50)
  }
}
function display_schedule(refresh){
  if(options.study){
    var k, i, p, e, d, t
    now = Date.now()
    if(refresh) page.timeline.innerHTML = page.ids.innerHTML = page.entries.innerHTML = ''
    nearest = [Infinity, null, null]
    page.timeline.innerHTML = ''
    options.n = 0
    for(k in schedule) if(schedule.hasOwnProperty(k)){
      options.n++
      if((now - schedule[k].last < 864e5 && schedule[k].first - now < 864e5 * options.days_future) ||
        (schedule[k].first - now < 864e5 && now - schedule[k].last < 864e5 * options.days_passed)){
        p = schedule[k].schedule
        if(refresh || !page.schedule_rows.hasOwnProperty(k)){
          page.schedule_rows[k] = {id: document.createElement('tr'), entries: document.createElement('tr')}
          page.schedule_rows[k].id.appendChild(e = document.createElement('td'))
          e.appendChild(e = document.createElement('button'))
          e.innerText = k
          page.ids.appendChild(page.schedule_rows[k].id)
          page.schedule_rows[k].entries.appendChild(e = document.createElement('table'))
          e.appendChild(document.createElement('tr'))
          e.appendChild(document.createElement('tr'))
        }else if(page.schedule_rows.hasOwnProperty(k)){
          page.schedule_rows[k].entries.classList.remove('range_hide')
          page.schedule_rows[k].id.classList.remove('range_hide')
        }
        display_single_schedule(schedule[k], page.entries)
      }else if(page.schedule_rows.hasOwnProperty(k)){
        page.schedule_rows[k].entries.classList.add('range_hide')
        page.schedule_rows[k].id.classList.add('range_hide')
      }
    }
    backup()
    page.timeline.style.left = '100px'
    if(nearest[1]){
      p = page.entries.getElementsByClassName('nearest')
      if(d = p.length) for(; d--;) p[d].classList.remove('nearest')
      k = nearest[2].id
      d = parseInt(nearest[1].children[1].innerText) - 1
      t = parseInt(nearest[1].children[2].innerText) - 1
      nearest[1].classList.add('nearest')
      page.schedule_rows[k].entries.firstElementChild.lastElementChild.children[d].children[t].classList.add('nearest')
      p = schedule[nearest[1].children[0].innerText].schedule[d]
      page.upnext.children[0].innerText = former.ftime.format(p.times[t])
      page.upnext.children[2].innerText = nearest[1].children[0].innerText
      page.upnext.children[4].innerText = d + 1
      page.upnext.children[6].innerText = t + 1
      update_queue[k] = {after: p.times[t], code: 2, day: nearest[2].day, time: nearest[2].time}
      setTimeout(load_schedule, p.times[t] + 200 - Date.now())
      if(study.protocols.hasOwnProperty(p.protocol) && study.protocols[p.protocol].remind_after){
        setTimeout(load_schedule, p.times[t] + 200 + study.protocols[p.protocol].remind_after * 6e4 - Date.now())
      }
    }else if(!options.n && !page.notifications.childElementCount){
      notify({status: 'use the "add or edit" menu (ESC) to add participants, protocols, and users'})
    }
    if(ticker) clearInterval(ticker)
    tick_clock()
    ticker = setInterval(tick_clock, 1e3)
  }
}
function display_single_schedule(fs, o, makenew){
  var id = fs.id, s = fs.schedule, start = 'string' === typeof(fs.start_time) ? toMs(fs.start_time) : fs.start_time,
      end = 'string' === typeof(fs.end_time) ? toMs(fs.end_time) : fs.end_time,
      n, d, b, i, v, pv, tl = o.id !== 'menu_schedule', e, c, ed, ee
  if(makenew){
    o.innerHTML = '<table><tr></tr><tr></tr></table>'
    ed = o.firstElementChild.firstElementChild.firstElementChild
    ee = o.firstElementChild.firstElementChild.lastElementChild
  }else{
    ed = page.schedule_rows[id].entries.firstElementChild.firstElementChild
    ee = page.schedule_rows[id].entries.firstElementChild.lastElementChild
    o.appendChild(page.schedule_rows[id].entries)
  }
  if(start > end) end += 864e5
  ee.style.height = 15 + (end - start) * 360 / 864e5 + 'px'
  ee.style.backgroundPositionY = -start * 360 / 864e5 + 'px'
  if(makenew){
    page.menu_timeline.style.height = ee.style.height
    page.menu_timeline.style.backgroundPositionY = ee.style.backgroundPositionY
  }else ee.addEventListener('mousemove', tick_info)
  for(n = Math.max(s.length, ed.childElementCount), d = 0, i = 0; d < n; d++){
    if(d >= s.length){
      for(n = s.length, d = ed.childElementCount - 1; d > n; d--){
        ed.removeChild(ed.children[d])
        ee.removeChild(ee.children[d])
      }
      break
    }
    if(d >= ed.childElementCount){
      display_day(ed, fs, d, id)
    }else{
      e = ed.children[d]
      e.className = e.children[1].innerText = s[d].protocol
      e.children[0].innerText = former.day.format(s[d].date)
      e.children[2].innerText = s[d].times.length
    }
    for(b = Math.max(s[d].times.length, ee.children[d].childElementCount), i = 0; i < b; i++){
      if(i >= s[d].times.length){
        for(b = s[d].times.length, i = ee.children[d].childElementCount - 1; i >= b; i--){
          ee.children[d].removeChild(ee.children[d].children[i])
        }
        break
      }
      v = s[d].times[i] - (s[d].date + start)
      if(i >= ee.children[d].childElementCount){
        display_time(id, v, ee.children[d], i, s[d].statuses[i])
      }else{
        e = ee.children[d].children[i]
        e.style.top = v * 360 / 864e5 + 'px'
        e.classList.replace(e.classList[1], names.status[s[d].statuses[i]])
        e.firstElementChild.innerText = id
        e.lastElementChild.innerText = i
      }
      if(tl){
        v = s[d].times[i] - now
        pv = v / (1e3 * options.timeline_scale)
        if(!nearest[1] || (v > 0 && v < nearest[0]) || (pv > -120 && pv < 1e4)){
          page.timeline.appendChild(e = document.createElement('div'))
          e.style.left = pv + 'px'
          if(s[d].statuses[i] === 1 && v > 0 && v < nearest[0]) nearest = [v, e, {id: id, day: d, time: i}]
          e.className = names.status[s[d].statuses[i]]
          e.appendChild(c = document.createElement('p'))
          c.innerText = id
          e.appendChild(c = document.createElement('p'))
          c.innerText = d + 1
          e.appendChild(c = document.createElement('p'))
          c.innerText = i + 1
        }
      }
    }
    if(s[d].hasOwnProperty('blackouts')) for(i = s[d].blackouts.length; i--;) display_blackout(
      id, s[d], i, (s[d].blackouts[i].start - (s[d].date + start)) * 360 / 864e5, ee.children[d]
    )
  }
}
function display_day(p, s, d, id){
  var e, c
  p.appendChild(e = document.createElement('td'))
  e.className = s.schedule[d].protocol
  e.appendChild(c = document.createElement('p'))
  c.innerText = former.day.format(s.schedule[d].date)
  e.appendChild(c = document.createElement('p'))
  c.innerText = s.schedule[d].protocol
  e.appendChild(c = document.createElement('p'))
  c.innerText = s.schedule[d].times.length
  c.className = 'index'
  p.nextElementSibling.appendChild(e = document.createElement('td'))
}
function display_time(id, v, e, i, status){
  var c, t
  e.appendChild(c = document.createElement('div'))
  c.className = 'ping ' + names.status[status]
  c.style.top = v * 360 / 864e5 + 'px'
  c.appendChild(t = document.createElement('p'))
  t.innerText = id
  c.appendChild(t = document.createElement('p'))
  t.innerText = i
  t.className = 'index'
}
function display_blackout(id, s, i, v, e){
  var c
  e.appendChild(c = document.createElement('div'))
  c.className = 'blackout'
  c.appendChild(document.createElement('p'))
  c.appendChild(document.createElement('span'))
  c.lastElementChild.innerText = s.blackouts.length - 1
  c.appendChild(document.createElement('span'))
  c.lastElementChild.innerText = id
  c.appendChild(document.createElement('p'))
  c.style.top = v + 'px'
  if(s.blackouts[i].hasOwnProperty('end')) c.style.height = (s.blackouts[i].end - s.blackouts[i].start) * 360 / 864e5 + 'px'
  return c
}
function tick_clock(){
  page.clock.firstElementChild.innerText = former.ftime.format(new Date())
  page.timeline.style.left = (parseFloat(page.timeline.style.left) - 1 / options.timeline_scale) + 'px'
}
function expand_tick(e){
  if(e.target && e.target.tagName === 'DIV'){
    var id = e.target.firstElementChild.innerText
    if(id && page.schedule_rows.hasOwnProperty(id)){
      expand_schedule({target: page.schedule_rows[id].entries.firstElementChild.firstElementChild.firstElementChild})
      page.schedule_rows[id].entries.firstElementChild.lastElementChild.scrollIntoView()
    }
  }
}
function toggle_pause(e){
  if(page.menu_schedule.childElementCount && page.menu_schedule.firstElementChild.childElementCount){
    var st = e.innerText === 'pause all' ? 'pause' : 'unpause', t, i
    e.innerText = st === 'pause' ? 'unpause all' : 'pause all'
    for(t = page.menu_schedule.firstElementChild.firstElementChild.children[1], i = t.childElementCount; i--;){
      if(t.children[i].firstElementChild.innerText === st) schedule_action_end({which: 1, target: t.children[i].firstElementChild})
    }
    setTimeout(function(){page.scheduler.notification.classList.remove('showing')}, 10)
  }
}
function scheduler_status(type, reset){
  if(type || reset){
    var same = reset
  }else{
    var t = temp_schedule.schedule, s, d = t.length, r, i, c, same = true
    type = 'participant'
    if(temp_schedule.id && study.participants.hasOwnProperty(temp_schedule.id)){
      s = study.participants[temp_schedule.id].schedule
      if(same = d === s.length) for(; d--;){
        if(t[d].date === s[d].date && t[d].protocol === s[d].protocol){
          i = t[d].times.length
          if(i === s[d].times.length){
            c = page.menu_schedule.lastElementChild.lastElementChild.lastElementChild.children[d].getElementsByClassName('ping')
            for(; i--;){
              c[i].classList.remove('temp_update')
              if(t[d].times[i] !== s[d].times[i] || t[d].statuses[i] !== s[d].statuses[i]){
                c[i].classList.add('temp_update')
                same = false
              }
            }
          }else same = false
        }else same = false
        same = same && t[d].hasOwnProperty('blackouts') === s[d].hasOwnProperty('blackouts')
        if(same && s[d].hasOwnProperty('blackouts') && t[d].blackouts.length === s[d].blackouts.length) for(i = s[d].blackouts.length; i--;)
          if(t[d].blackouts[i].start !== s[d].blackouts[i].start || t[d].blackouts[i].end !== s[d].blackouts[i].end){
            same = false
            break
          }
      }
      if(same){
        same = temp_schedule.hasOwnProperty('blackouts') === study.participants[temp_schedule.id].hasOwnProperty('blackouts')
        if(same && temp_schedule.hasOwnProperty('blackouts')){
          t = temp_schedule.blackouts, s = study.participants[temp_schedule.id].blackouts, d = s.length, same = t.length === d
          if(same) for(; d--;) if(s[d].start !== t[d].start || s[d].end !== t[d].end){
            same = false
            break
          }
        }
      }
    }
    temp_schedule.updated = !same
  }
  if(same){
    page.scheduler.notification.classList.remove('showing')
    page.scheduler[type].submit.innerText = 'Add/Update'
    page.scheduler[type].submit.classList.remove('pending_submit')
  }else{
    notify({status: type === 'participant' ? 'Update to apply changes, or close the menu to revert' : 'Update to submit changes'}, true)
    page.scheduler[type].submit.innerText = 'Update'
    page.scheduler[type].submit.classList.add('pending_submit')
  }
}
function clear_tick_editor(e){
  e.parentElement.classList.remove('editing')
  e.parentElement.removeChild(e)
}
function show_hovered(e){
  if(e.target && e.target.firstElementChild){
    var id = e.target.firstElementChild.innerText, c, d, b
    page.upnext.nextElementSibling.style.display = ''
    page.upnext.style.display = 'none'
    if(schedule.hasOwnProperty(id)){
      d = schedule[id].schedule[parseInt(e.target.children[1].innerText) - 1]
      b = parseInt(e.target.children[2].innerText)
      e.target.classList.add('selected')
      if(page.schedule_rows[id].entries.firstElementChild.lastElementChild.children[d.day].childElementCount >= b)
        page.schedule_rows[id].entries.firstElementChild.lastElementChild.children[d.day].children[b - 1].classList.add('selected')
      c = page.upnext.nextElementSibling.children
      c[0].innerText = former.ftime.format(d.times[b - 1])
      c[2].innerText = id
      c[4].innerText = d.day + 1
      c[6].innerText = b
    }
  }
}
function tick_info(e){
  if(e.target && (e.target.className === 'blackout' || e.target.classList[0] === 'ping')){
    e.target.parentElement.appendChild(page.tick_info)
    var d = e.target.parentElement.cellIndex, i = parseInt(e.target.children[1].innerText), s,
        b = e.target.parentElement.getBoundingClientRect(), ie
    page.tick_info.style.display = ''
    if(e.target.className === 'blackout'){
      s = study.participants[e.target.children[2].innerText]
      page.tick_info.firstElementChild.innerText = former.ftime.format(s.schedule[d].blackouts[i].start)
      page.tick_info.lastElementChild.innerText = former.ftime.format(s.schedule[d].blackouts[i].end)
      page.tick_info.className = 'blackout_display'
    }else{
      s = study.participants[e.target.firstElementChild.innerText]
      page.tick_info.firstElementChild.innerText = former.ftime.format(s.schedule[d].times[i])
      page.tick_info.className = page.tick_info.lastElementChild.innerText = names.status[s.schedule[d].statuses[i]]
    }
    ie = page.tick_info.getBoundingClientRect()
    page.tick_info.style.top = (e.clientY - b.y - 1) - ie.height + 'px'
    page.tick_info.style.left = (e.clientX - b.x - 1) - ie.width + 'px'
  }else{
    page.tick_info.style.display = 'none'
  }
}
function show_nearest(e){
  if(e.target){
    e.target.classList.remove('selected')
    page.schedule_rows[e.target.children[0].innerText].entries.firstElementChild.lastElementChild
        .children[parseInt(e.target.children[1].innerText) - 1]
        .children[parseInt(e.target.children[2].innerText) - 1].classList.remove('selected')
    page.upnext.nextElementSibling.style.display = 'none'
    page.upnext.style.display = ''
  }
}
function add_day(){
  var e, c, d
  if(!page.menu_schedule.childElementCount){
    page.menu_schedule.innerHTML = '<table><tr></tr><tr></tr><tr></tr><tr></tr></table>'
  }
  e = page.menu_schedule.firstElementChild.firstElementChild
  if(!e.children[0].childElementCount || e.children[0].lastElementChild.childElementCount !== 4){
    e.children[3].appendChild(document.createElement('td'))
    e.children[1].appendChild(c = document.createElement('td'))
    c.appendChild(c = document.createElement('button'))
    c.type = 'button'
    c.innerText = c.className = 'pause'
    e.children[2].appendChild(c = document.createElement('td'))
    c.appendChild(c = document.createElement('button'))
    c.type = 'button'
    c.innerText = '↻'
    e.children[0].appendChild(c = document.createElement('td'))
    c.className = 'preadd'
    c.appendChild(document.createElement('p'))
    if(!temp_schedule.hasOwnProperty('schedule')) temp_schedule.schedule = []
    d = temp_schedule.schedule.length
    temp_schedule.schedule.push({day: d, date: d ? temp_schedule.schedule[d - 1].date + 864e5 : new Date().setHours(24, 0, 0, 0), times: [], statuses: []})
    c.lastElementChild.innerText = former.day.format(temp_schedule.schedule[d].date)
    c.appendChild(document.createElement('p'))
    if(page.scheduler.participant.protocol_select.childElementCount && d < e.children[2].childElementCount){
      temp_schedule.schedule[d].protocol = c.className = c.lastElementChild.innerText =
        page.scheduler.participant.protocol_select.children[0].innerText
      schedule_action_end({which: 1, target: e.children[2].children[d].firstElementChild})
    }
    c.appendChild(document.createElement('p'))
    c.lastElementChild.className = 'index'
    c.lastElementChild.innerText = 0
    c.scrollIntoView()
  }
}
function refresh(){
  if(window.localStorage) window.localStorage.clear()
  window.location.reload()
}
function make_schedule(preserve, background){
  var io = temp_schedule, i, e = page.scheduler.participant.options.getElementsByTagName('INPUT'), day, n, a, v, d, cn, pd, pi, ds, nd, ck, bl = []
  for(i = e.length; i--;) if(e[i].name) io[e[i].name] = e[i][e[i].type === 'checkbox' ? 'checked' : 'value']
  io.protocols = page.scheduler.participant.protocol_order.innerText.split(', ')
  e = page.scheduler.participant.options.getElementsByTagName('SELECT')
  for(i = e.length; i--;) if(e[i].name) io[e[i].name] = e[i].options[e[i].selectedIndex].value
  if(io.phone) io.phone = parseInt(io.phone)
  if(!io.start_day) io.start_day = Date.now()
  if('string' === typeof io.start_day) io.start_day = io.start_day.replace(patterns.numpunct, '')
  io.start_day =  patterns.dashdate.test(io.start_day) ? new Date(io.start_day + 'T00:00:00').getTime() : new Date(io.start_day).setHours(24, 0, 0, 0)
  io.start_time = io.start_time ? toMs(io.start_time) : 0
  if(!io.end_day) io.end_day = io.start_day + 14 * 864e5
  if('string' === typeof io.end_day) io.end_day = io.end_day.replace(patterns.numpunct, '')
  io.end_day = patterns.dashdate.test(io.end_day) ? new Date(io.end_day + 'T00:00:00').getTime() : new Date(io.end_day).setHours(24, 0, 0, 0)
  io.end_time = io.end_time ? toMs(io.end_time) : 864e5
  if(io.start_time > io.end_time) io.end_time += 864e5
  n = Math.ceil(Math.abs(io.end_day - io.start_day) / 864e5) + 1
  io.daysofweek = get_daysofweek()
  for(ck = false, i = io.daysofweek.length; i--;){
    ck = true
    break
  }
  if(!ck) n = 0
  if(io.hasOwnProperty('blackouts')){
    bl = Sanitize.blackouts(io.blackouts)
    i = bl.length
    if(n && i) for(; i--;){
      n -= Math.ceil(Math.abs(bl[i].end - bl[i].start) / 864e5) + 1
    }
    if(n < 0) n = 0
  }
  if(!io.hasOwnProperty('schedule')) io.schedule = []
  io.updated = false
  if(n && io.start_time + io.end_time + 1 && io.end_time > io.start_time){
    if(!io.hasOwnProperty('schedule')){
      io.schedule = []
      preserve = false
    }else if(!io.schedule.length) preserve = false
    if(io.protocols && io.protocols[0] && !preserve){
      if(edit.holding && edit.holding.className !== 'blackout') edit.e = edit.holding = false
      io.first = Infinity
      io.last = -Infinity
      for(day = io.start_day, d = 0, ds = 0; d < n; d++){
        if(i = bl.length){
          for(nd = day + 864e5 * (d + ds); i--;){
            if(nd >= bl[i].start && nd <= bl[i].end){
              ds += (bl[i].end - nd) / 864e5 + 1
            }
          }
        }
        if(!io.daysofweek[i = new Date(day + 864e5 * (d + ds)).getDay()]){
          a = 0
          while(!io.daysofweek[i]){
            i++
            a++
            if(i >= io.daysofweek.length){
              if(a > 6) break
              i = 0
            }
          }
          ds += a
        }
        if(day + 864e5 * (d + ds - 1) > io.end_day) break
        if(io.schedule.length > d && io.schedule[d].date === day + 864e5 * (d + ds)){
          io.schedule[d].times = []
          io.schedule[d].statuses = []
        }else io.schedule[d] = {day: d, date: day + 864e5 * (d + ds), times: [], statuses: []}
      }
      if(n < io.schedule.length) for(n = io.schedule.length; d < n; d++) io.schedule.splice(d, 1)
      n = io.schedule.length
      roll_protocols(n, io)
      for(pd = 1, pi = 0, d = 0; d < n; d++){
        if(pd > io.protocol_days[io.protocol_order[pi]]){
          pd = 2
          pi++
        }else pd++
        io.schedule[d].protocol = io.protocol_order[pi]
        if(study.protocols.hasOwnProperty(io.protocol_order[pi])) roll_times(d, study.protocols[io.protocol_order[pi]], io)
        if(io.schedule[d].times[0] < io.first) io.first = v
        if(io.schedule[d].times[io.schedule[d].times.length - 1] > io.last) io.last = io.schedule[d].times[io.schedule[d].times.length - 1]
      }
      backup()
      io.updated = true
    }
    if(!io.first){
      io.first = Infinity
      io.last = -Infinity
      for(d = io.schedule.length; d--;){
        v = io.schedule[d].times[io.schedule[d].times.length - 1]
        if(v < io.first) io.first = v
        if(v > io.last) io.last = v
      }
    }
    if(!background){
      display_single_schedule(io, page.menu_schedule, true)
      page.menu_schedule.firstElementChild.firstElementChild.firstElementChild.insertAdjacentElement('afterEnd', e = document.createElement('tr'))
      e.insertAdjacentElement('afterEnd', document.createElement('tr'))
      for(v = io.schedule.length, i = 0; i < v; i++){
        e.appendChild(document.createElement('td'))
        e.lastElementChild.appendChild(document.createElement('button'))
        e.lastElementChild.lastElementChild.type = 'button'
        cn = io.schedule[i].statuses.indexOf(6) !== -1 ? 'unpause' : 'pause'
        e.lastElementChild.lastElementChild.innerText = cn
        if(cn === 'unpause'){
          e.lastElementChild.lastElementChild.className = 'pending'
          page.scheduler.participant.pause_toggle.innerText = 'unpause all'
        }else e.lastElementChild.lastElementChild.className = 'pause'
        e.nextElementSibling.appendChild(document.createElement('td'))
        e.nextElementSibling.lastElementChild.appendChild(document.createElement('button'))
        e.nextElementSibling.lastElementChild.lastElementChild.type = 'button'
        e.nextElementSibling.lastElementChild.lastElementChild.innerText = '↻'
      }
    }
  }else{
    notify({status: 'specify Study days and Active hours to roll a schedule'}, true)
  }
}
function toggle_expand(e){
  var c, i
  if(e.innerText === 'collapse'){
    c = page.entries.getElementsByClassName('selected'), i = c.length
    for(; i--;) if(c[i].className !== 'hide') expand_schedule({target: c[i].firstElementChild.firstElementChild.firstElementChild})
    e.innerText = 'expand'
  }else{
    c = page.entries.children, i = c.length
    for(; i--;) if(c[i].className !== 'hide' && c[i].firstElementChild.className !== 'selected')
      expand_schedule({target: c[i].firstElementChild.firstElementChild.firstElementChild})
    e.innerText = 'collapse'
  }
}
function toggle_panes(e){
  if(e.target && e.target.tagName === 'BUTTON'){
    for(var t = e.target.parentElement.cellIndex, i = page.scheduler.panes.length, n, id, oi; i--;){
      if(t === i){
        options.tab = t
        backup()
        page.scheduler.panes[i].style.display = ''
        page.scheduler_tabs[i].className = 'selected'
        n = page.scheduler.panes[i].id
        if(study.hasOwnProperty(n + 's') && study[n + 's'].hasOwnProperty(id = page.scheduler[n].id.value)){
          for(oi = page.scheduler[n].list.childElementCount; oi--;){
            if(id === page.scheduler[n].list.children[oi].innerText){
              page.scheduler[n].list.selectedIndex = oi
              break
            }
          }
        }
        page.scheduler.panes[i].lastElementChild.lastElementChild.firstElementChild.firstElementChild.firstElementChild.innerText = 'Remove'
        page.scheduler.notification.classList.remove('showing')
      }else{
        page.scheduler.panes[i].style.display = 'none'
        page.scheduler_tabs[i].className = ''
      }
    }
  }
}
function expand_schedule(e){
  if(e.target){
    e = e.target
    e = e.tagName === 'P' ? e.parentElement.parentElement : e.parentElement
    if(e.tagName === 'TR' && e.rowIndex === 0){
      e = e.parentElement
      if(e && e.parentElement && 'undefined' !== typeof e.parentElement.rowIndex){
        var c = page.ids.children[e.parentElement.rowIndex].firstElementChild.firstElementChild
        if(e.className === 'selected'){
          c.className = e.className = ''
          c.style.height = e.getBoundingClientRect().height + 'px'
        }else{
          c.className = e.className = 'selected'
          c.style.height = e.getBoundingClientRect().height + 'px'
        }
      }
    }
  }
}
function add_study(e){
  e = e.parentElement.previousElementSibling.firstElementChild
  if(e.value){
    request('/operation', function(d){
      if(options.studies.indexOf(e.value) === -1) options.studies.push(e.value)
      options.study = e.value
      notify(d)
      display_studies()
      page.study_selector.style.display = 'none'
      load_schedule()
    }, notify, {type: 'add_study', study: e.value, protocols: options.protocol})
  }
}
function display_studies(){
  if(!options.studies.length){
    page.studies.innerHTML = '<tr><td>No studies on record.</td></tr>'
  }else{
    page.studies.innerHTML = ''
    for(var n = options.studies.length, i = 0, e, c; i < n; i++){
      page.studies.appendChild(e = document.createElement('tr'))
      e.appendChild(c = document.createElement('td'))
      c.appendChild(c = document.createElement('button'))
      c.innerText = c.value = options.studies[i]
      e.appendChild(c = document.createElement('td'))
      c.appendChild(c = document.createElement('button'))
      c.type = 'button'
      c.innerText = 'delete'
    }
  }
}
function select_study(){
  if(options.study === 'demo'){
    options.study = ''
    window.location.href = window.location.href.replace(patterns.query, '')
  }
  page.selected_study.innerText = 'select study'
  if(!session || !session.signedin){
    pending.select_study = select_study
  }else{
    page.study_selector.style.display = page.studies_wrap.style.display = ''
    page.signin_prompt.style.display = 'none'
    options.study = ''
    backup()
    if(options.studies && options.studies.length){
      display_studies()
    }else{
      request('/operation', function(d){
        options.studies = JSON.parse(d)
        display_studies()
        backup()
      }, notify, {type: 'list_studies'})
    }
  }
  if(page.side_menu.style.left === '0px') toggle_menu()
}
function study_selection(e){
  if(e.target.tagName === 'BUTTON'){
    if(e.target.innerText === 'delete'){
      var s = e.target.parentElement.previousElementSibling.firstElementChild.value
      request('/operation', function(d){
        notify(d)
        options.studies.splice(options.studies.indexOf(s), 1)
        backup()
        select_study()
      }, notify, {type: 'remove_study', study: s})
    }else{
      options.study = e.target.innerText
      backup()
      load_schedule()
    }
  }
}
function fill_protocol_order(e){
  var p = page.scheduler.participant.protocol_order, k, i, n
  if(e.target && e.target.tagName === 'BUTTON'){
    p.innerHTML = ''
    if(e.target.innerText === 'all'){
      for(k in study.protocols) if(k !== '' && study.protocols.hasOwnProperty(k)){
        if(p.childElementCount) p.appendChild(document.createTextNode(', '))
        p.appendChild(document.createElement('span'))
        p.lastElementChild.innerText = k
      }
    }
  }else if(e.length){
    p.innerHTML = ''
    for(n = e.length, i = 0; i < n; i++) if(e[i] !== ''){
      if(i !== 0) p.appendChild(document.createTextNode(', '))
      p.appendChild(document.createElement('span'))
      p.lastElementChild.innerText = e[i]
    }
  }
}
function edit_protocol_list(e){
  if(e.target && e.target.tagName){
    if(e.target.tagName === 'P'){
      if(page.scheduler.participant.protocol_order.childElementCount) page.scheduler.participant.protocol_order.appendChild(document.createTextNode(', '))
      page.scheduler.participant.protocol_order.appendChild(document.createElement('span'))
      page.scheduler.participant.protocol_order.lastElementChild.innerText = e.target.innerText
    }else if(e.target.tagName === 'SPAN'){
      if(e.target.nextSibling){
        e.target.nextSibling.parentNode.removeChild(e.target.nextSibling)
      }else if(e.target.previousSibling) e.target.previousSibling.parentNode.removeChild(e.target.previousSibling)
      e.target.parentNode.removeChild(e.target)
    }
  }
  options.participant.protocols = page.scheduler.participant.protocol_order.innerText.split(', ')
}
function update_user(e){
  if(e.target.type){
    if(e.target.type === 'checkbox'){
      if(options.user[e.target.name] !== e.target.checked) scheduler_status('user')
      options.user[e.target.name] = e.target.checked
    }
    backup()
  }
}
function filter(e){
  var s = /^/, k, t
  try{s = new RegExp(e.value)}catch(e){}
  for(k in page.schedule_rows) if(page.schedule_rows.hasOwnProperty(k)){
    t = s.test(k) ? 'remove' : 'add'
    page.schedule_rows[k].id.classList[t]('hide')
    page.schedule_rows[k].entries.classList[t]('hide')
  }
}
function clear_filter(e){
  e.parentElement.previousElementSibling.firstElementChild.value = ""
  filter({value: ''})
}
function toggle_logs(){
  if(page.logs.frame.style.display === 'none'){
    toggle_menu()
    if(!page.logs.tabs.firstElementChild.firstElementChild.childElementCount) list_logs()
    page.logs.frame.style.display = ''
    page.scheduler.frame.style.display = 'none'
  }else{
    page.logs.frame.style.display = 'none'
  }
}
function list_logs(){
  if(options.study) request('/operation', function(d){
    if(d){
      page.logs.tabs.innerHTML = '<table><tr></tr></table>'
      page.logs.panes.innerHTML = ''
      var k, r = /(\d{2})(?=\d)/g, e = page.logs.tabs.firstElementChild.firstElementChild, c
      logs = JSON.parse(d)
      if(logs.hasOwnProperty('status')){
        notify(d)
        logs = {}
      }
      for(k in logs) if(logs.hasOwnProperty(k)){
        e.appendChild(c = document.createElement('th'))
        c.appendChild(c = document.createElement('button'))
        c.type = 'button'
        c.innerText = c.value = k.replace(r, '$1/')
      }
    }
  }, notify, {type: 'list_logs', study: options.study})
}
function view_log(e){
  if(options.study && e.target.tagName === 'BUTTON'){
    var p = page.logs.tabs.getElementsByClassName('selected')[0], n = e.target.value.replace(patterns.slash, '')
    if(p) p.className = ''
    e.target.className = 'selected'
    if(logs[n] && n !== former.date.format(new Date()).replace(patterns.stripdate, '')){
      page.logs.panes.innerText = logs[n]
    }else{
      request('/operation', function(d){
        if(d) page.logs.panes.innerText = logs[n] = JSON.parse(d).log
      }, notify, {type: 'view_log', study: options.study, file: e.target.value})
    }
  }
}
function toggle_menu(){
  if(!page.side_menu.style.left || page.side_menu.style.left === '-117px'){
    page.wrap.style.left = '117px'
    page.foot_menu.style.left = '117px'
    page.side_menu.style.left = '0px'
  }else{
    page.wrap.style.left = '0px'
    page.foot_menu.style.left = '0px'
    page.side_menu.style.left = '-117px'
  }
}
function toggle_scheduler(){
  if(page.scheduler.frame.style.display === 'none'){
    var po = page.scheduler.participant.protocol_order, k, i, n, e = page.scheduler.participant.options.getElementsByTagName('INPUT')
    for(i = e.length; i--;) if(e[i].name && !patterns.idPhone.test(e[i].name) && options.participant.hasOwnProperty(e[i].name))
      e[i][e[i].type === 'checkbox' ? 'checked' : 'value'] = options.participant[e[i].name]
    if(options.participant.hasOwnProperty('daysofweek')){
      for(i = options.participant.daysofweek.length; i--;)
        page.scheduler.participant.daysofweek.children[i].firstElementChild.checked = options.participant.daysofweek[i]
    }else{
      options.participant.daysofweek = get_daysofweek()
      backup()
    }
    edit.holding = edit.e = edit.moved = false
    page.scheduler.participant.blackouts.innerHTML = ''
    for(e = page.scheduler.user.options.getElementsByTagName('INPUT'), i = e.length; i--;) if(e[i].name && options.user.hasOwnProperty(e[i].name))
      e[i][e[i].type === 'checkbox' ? 'checked' : 'value'] = options.user[e[i].name]
    po.innerHTML = page.menu_schedule.innerHTML = ''
    if(options.participant.hasOwnProperty('protocols')){
      for(n = options.participant.protocols.length, i = 0; i < n; i++) if(options.participant.protocols[i] !== '' &&
          options.protocol.hasOwnProperty(options.participant.protocols[i])){
        if(po.childElementCount) po.appendChild(document.createTextNode(', '))
        po.appendChild(document.createElement('span'))
        po.lastElementChild.innerText = options.participant.protocols[i]
      }
    }else{
      for(k in study.protocols) if(k !== study.protocols.hasOwnProperty(k)){
        if(po.childElementCount) po.appendChild(document.createTextNode(', '))
        po.appendChild(document.createElement('span'))
        po.lastElementChild.innerText = k
      }
    }
    if(options.participant.hasOwnProperty('order_type') && (i = names.order_type.indexOf(options.participant.order_type.toLowerCase())) !== -1)
      page.scheduler.participant.protocol_type.selectedIndex = i
    for(i = 3; i--;) fill_selection(i)
    page.logs.frame.style.display = 'none'
    page.scheduler.frame.style.display = ''
    if(options.tab) toggle_panes({target: page.scheduler.frame.getElementsByTagName('BUTTON')[options.tab]})
    page.scheduler.notification.classList.remove('showing')
    page.scheduler.participant.submit.innerText = 'Add/update'
    page.scheduler.participant.submit.className = ''
    temp_schedule = {}
    make_schedule(true, true)
  }else{
    var e = page.scheduler.participant.options.getElementsByTagName('INPUT')
    e[0].value = e[1].value = ''
    page.scheduler.frame.style.display = 'none'
    page.menu_timeline.style.height = '0px'
    document.body.appendChild(page.tick_editor)
    page.tick_editor.style.display = 'none'
  }
}
function fill_selection(type){
  var k, n = names.tabs[type], t = names.types[type],
    o = study[t + 's']
  page.scheduler[t].list.innerHTML = '<option value="">New ' + n + '</option>'
  if(t === 'protocol') page.tick_editor.children[1].children[1].innerHTML = page.scheduler.participant.protocol_select.innerHTML = ''
  for(k in o) if(o.hasOwnProperty(k)){
    if(t === 'protocol'){
      page.tick_editor.children[1].children[1].appendChild(document.createElement('option'))
      page.scheduler.participant.protocol_select.appendChild(document.createElement('p'))
      page.scheduler.participant.protocol_select.lastElementChild.innerText = page.tick_editor.children[1].children[1].lastElementChild.innerText = k
    }
    page.scheduler[t].list.appendChild(document.createElement('option'))
    page.scheduler[t].list.lastElementChild.innerText = k
  }
  page.scheduler[t].submit.parentElement.previousElementSibling.firstElementChild.innerText = 'Remove'
}
function prompt(r){
  options.last = r
  backup()
  signio()
}
function backup(){
  options.participant.phone = ''
  store.options = JSON.stringify(options)
}
function backup_demo(){
  store.study = JSON.stringify(study)
}
function reset_form(t){
  page.scheduler[t].list.selectedIndex = 0
  page.scheduler[t].list.onchange()
}
function fill_existing(e, t){
  t = t || 'participant'
  if(e && e.target){
    if(e.target.tagName === 'BUTTON'){
      options.tab = 0
      toggle_scheduler()
      page.scheduler.participant.list.selectedIndex = e.target.parentElement.parentElement.rowIndex + 1
      page.scheduler.participant.list.onchange()
    }
    return
  }
  if(e && e.options){
    for(var pn = e.options[e.selectedIndex].value, p = 'string' === typeof t ? study[t + 's'].hasOwnProperty(pn) ? study[t + 's'][pn]
        : options[t].hasOwnProperty(pn) ? options[t][pn] : {} : t, t = 'string' === typeof t ? t : 'participant',
        e = page.scheduler[t].options.getElementsByTagName('input'), d, c, v, n, i = e.length; i--;){
      c = e[i]
      if(c.name === 'name' || c.name === 'id'){
        c.value = pn
        t === 'protocol' ? update_protocol({target: c}) : t === 'participant' ? update_options({target: c}) : update_user({target: c})
      }else if(c.name){
        c[c.type === 'checkbox' ? 'checked' : 'value'] = p.hasOwnProperty(c.name) && p[c.name] ? p[c.name] : c.name === 'color' ? '#000000': ''
      }
    }
    e = page.scheduler[t].options.getElementsByTagName('select')
    if(i = e.length) for(; i--;){
      v = e[i].name
      if(v && names.hasOwnProperty(v)) e[i].selectedIndex = p.hasOwnProperty(v) ? names[v].indexOf(p[v].toLowerCase()) : 0
    }
    if(p.hasOwnProperty('protocols')) fill_protocol_order(p.protocols)
  }else{
    reset_form(t)
  }
  update_protocol()
  if(t === 'participant'){
    if(p.hasOwnProperty('daysofweek')){
      for(i = 0; i < 7; i++) page.scheduler.participant.daysofweek.children[i].firstElementChild.checked = p.daysofweek[i]
    }else p.daysofweek = get_daysofweek()
    page.scheduler.participant.blackouts.innerHTML = ''
    if(p.hasOwnProperty('blackouts')){
      for(n = p.blackouts.length, i = 0; i < n; i++){
        add_blackout()
        page.scheduler.participant.blackouts.lastElementChild.children[0].value = former.dashdate(p.blackouts[i].start)
        page.scheduler.participant.blackouts.lastElementChild.children[1].value = former.dashdate(p.blackouts[i].end)
      }
    }
    page.scheduler.participant.pause_toggle.innerText = 'pause all'
    temp_schedule = p ? JSON.parse(JSON.stringify(p)) : {}
    pn === '' ? page.menu_schedule.innerHTML = '' : make_schedule(true)
  }
  scheduler_status(t, true)
}
function linker(s){
  return s.replace(patterns.http, '<a target="_blank" href="$1">$2</a>')
}
function remove(s){
  if(options.study){
    var n = page.scheduler[s].list.options[page.scheduler[s].list.selectedIndex].value
    if(n){
      if(page.scheduler[s].submit.parentElement.previousElementSibling.firstElementChild.innerText === 'Remove'){
        page.scheduler[s].submit.parentElement.previousElementSibling.firstElementChild.innerText = 'Confirm removal'
        notify({status: 'click again to remove'}, true)
      }else{
        page.scheduler[s].submit.parentElement.previousElementSibling.firstElementChild.innerText = 'Remove'
        request('/operation', notify, notify, {type: 'remove_' + s, study: options.study, id: n})
        if(study[s + 's'].hasOwnProperty(n)) delete study[s + 's'][n]
        if(s === 'participant' && page.schedule_rows.hasOwnProperty(n)){
          schedule = study.participants
          page.schedule_rows[n].id.parentElement.removeChild(page.schedule_rows[n].id)
          page.schedule_rows[n].entries.parentElement.removeChild(page.schedule_rows[n].entries)
          delete page.schedule_rows[n]
        }
        fill_existing(false, s)
        fill_selection(['participant', 'protocol', 'user'].indexOf(s))
        if(options[s].hasOwnProperty(n)){
          if(s !== 'participant') delete options[s][n]
        }else{
          toggle_scheduler()
        }
        if(s !== 'users') load_schedule()
      }
    }else notify({status: 'fill the first input to add or update'}, true)
  }else notify({status: 'select a study to remove anything'}, true)
}
function update_participant_list(){
  var e = page.scheduler.participant.selector, k
  e.innerHTML = '<option value="">New Participant</options>'
  for(k in schedule) if(schedule.hasOwnProperty(k)){
    e.appendChild(document.createElement('option'))
    e.lastElementChild.value = e.lastElementChild.innerText = k
  }
}
function build_link(url, idpar, id){
  return url + (idpar ? (patterns.qmark.test(url) ? '&' : '?') + idpar + '=' + id : '')
}
function update_protocol(e){
  var m, o = page.scheduler.protocol.message, pn = page.scheduler.protocol.id.value,
      p = study.protocols.hasOwnProperty(pn) ? study.protocols[pn] : options.protocol[pn], u = false
  if(pn){
    if(!p) p = options.protocol[pn] = {}
    if(e && e.target && e.target.name){
      e = e.target
      if(e.tagName === 'SELECT'){
        u = p[e.name] && p[e.name] !== e.options[e.selectedIndex].innerText
        p[e.name] = e.options[e.selectedIndex].innerText
      }else{
        u = p[e.name] && p[e.name] != e[e.type === 'checkbox' ? 'checked' : 'value']
        p[e.name] = e[e.type === 'checkbox' ? 'checked' : 'value']
        if('string' === typeof p[e.name] && !patterns.cmli.test(e.name)) p[e.name] = parseFloat(p[e.name])
        if('color' === e.name) apply_colors()
      }
    }
    if(pn !== '' && p.beeps && p.initial_message){
      options.protocol[pn] = p
      backup()
    }
    if(!e || patterns.mli.test(e.name)){
      o.innerHTML = ''
      if(p.hasOwnProperty('initial_message')) build_message(p.initial_message, o, p.link, p.id_parameter, 12345678)
      if(p.hasOwnProperty('reminder_message')){
        if(!p.hasOwnProperty('initial_message')) o.innerHTML = ''
        build_message(p.reminder_message, o, p.reminder_link ? p.link : false, p.id_parameter, 12345678)
      }
    }
    if(u) scheduler_status('protocol')
  }
}
function build_message(m, o, l, p, id){
  m = (m + ' ' + (l ? build_link(l, p, id) : '')).replace(patterns.gcm, ' ')
  if(o){
    o.appendChild(document.createElement('p'))
    m.replace(patterns.space, '').length > 168 ? chunk_message(m, o) : o.lastElementChild.innerHTML = linker(m)
  }
  return m
}
function apply_colors(){
  var k, c
  if(page.colors.styleSheet) page.colors.styleSheet.cssText = ''
  for(k in options.protocol) if(options.protocol.hasOwnProperty(k) && options.protocol[k].hasOwnProperty('color')){
    c = '.' + k + '{background: ' + options.protocol[k].color + '}\n'
    page.colors.styleSheet ? page.colors.styleSheet.cssText += c : page.colors.appendChild(document.createTextNode(c))
  }
  document.head.appendChild(page.colors)
}
function chunk_message(message, output, fun){
  fun = fun || linker
  for(var s = message.split(patterns.space), n = s.length, i = 0, c = 0; i < n; i++){
    c += s[i].length
    if(c > 160){
      output.appendChild(document.createElement('p'))
      c = 0
    }
    output.lastElementChild.innerHTML += fun(' ' + s[i])
  }
}
function genid(e){
  var id = Math.ceil(Math.random() * 9) + Math.random().toString().match(patterns.d7)[0]
  if(schedule.hasOwnProperty(id)) return getid(e)
  options.id = id
  backup()
  if(e) e.previousElementSibling.value = id
  return id
}
function update_options(e){
  e = e.target
  if(e.name){
    var ti = page.scheduler.menu.getElementsByClassName('selected')[0].parentElement.cellIndex, t = names.types[ti], c, i
    if(e.tagName === 'INPUT'){
      options.participant[e.name] = e[e.type === 'checkbox' ? 'checked' : 'value']
      if(study[t + 's'].hasOwnProperty(e.value)){
        for(c = page.scheduler[t].list.options, i = c.length; i--;) if(e.value == c[i].innerText){
          if(page.scheduler[t].list.selectedIndex !== i){
            page.scheduler[t].list.selectedIndex = i
            page.scheduler[t].list.onchange()
          }
          break
        }
      }
    }else if(e.tagName === 'SELECT'){
      options.participant[e.name] = e.options[e.selectedIndex].value
    }
    backup()
    make_schedule(e.names !== 'id' && e.names !== 'phone')
  }else if(e.type === 'checkbox'){
    temp_schedule.daysofweek = options.participant.daysofweek = get_daysofweek()
  }
}
function get_daysofweek(){
  for(var i = 0, r = []; i < 7; i++) r.push(page.scheduler.participant.daysofweek.children[i].firstElementChild.checked)
  return r
}
function toMs(time){
  var s = time.toString(), p = ['', ''], n = 0
  if(patterns.apm.test(s)){
    s = s.replace(patterns.numpunct, '')
    patterns.colon.lastIndex = -1
    if(patterns.colon.test(s)){
      p = s.split(patterns.colon)
      n = parseInt(p[0])
      if(patterns.p.test(time)) n += 12
      n = n * 36e5 + parseInt(p[1]) * 6e4 + (p.length === 3 ? parseInt(p[2]) * 1e3 : 0)
    }else{
      n = parseFloat(s)
      if(patterns.p.test(time)) n += 12
      n *= 36e5
    }
  }else{
    n = parseFloat(time)
    if(n < 36e5) n *= n < 25 ? 36e5 : n < 1440 ? 6e4 : 1e3
  }
  return Math.floor(n)
}
function roll_protocols(n, io){
  io.protocol_days = {}
  for(var a = [], set = [], t = -1, pn = io.protocols.length, i = pn, p; i--;){
    p = options.protocol[io.protocols[i]]
    io.protocol_days[io.protocols[i]] = !p.days ? Math.ceil(n / pn) : p.days < 1 ? Math.ceil(p.days * n) : p.days
    if(!io.protocol_days[io.protocols[i]]) io.protocol_days[io.protocols[i]] = 1
  }
  io.protocol_order = []
  i = 0
  switch(io.order_type){
    case 'shuffle':
      set = []
      while(i < n) if(set.indexOf(t = Math.floor(Math.random() * pn)) === -1){
    		io.protocol_order.push(io.protocols[t])
        set.push(t)
        i += io.protocol_days[io.protocols[t]]
    	}else if(set.length >= pn) set = []
      break
    case 'ordered':
      while(i < n){
        if(++t >= pn) t = 0
        io.protocol_order.push(io.protocols[t])
        i += io.protocol_days[io.protocols[t]]
      }
      break
    default:
      while(i < n){
        io.protocol_order.push(io.protocols[Math.floor(Math.random() * pn)])
        i += io.protocol_days[io.protocol_order[io.protocol_order.length - 1]]
      }
  }
}
function roll_times(d, p, io){
  if(io){
    var se = io.schedule[d], day = se.date, start = day + io.start_time + (p.offset || 0) * 6e4, n = p.beeps,
        end = day + io.end_time, binsize = Math.floor((io.end_time - io.start_time) / n),
        i = 0, s, b, e, v, l = se.times.length, t = p.randomization, invalid = true
    if(!p.random_start){
      i++
      if(se.hasOwnProperty('blackouts')) for(b = se.blackouts.length; b--;){
        if(start >= se.blackouts[b].start && start <= se.blackouts[b].end) start = se.blackouts[b].end + (p.offset || 0) * 6e4
      }
      se.times.push(start)
      se.statuses.push(1)
    }
    for(; i < n; i++){
      switch(t){
        case 'none':
          v = i ? se.times[l + i - 1] + p.minsep * 6e4 : start
          if(se.hasOwnProperty('blackouts')) for(b = se.blackouts.length; b--;){
            if(v >= se.blackouts[b].start && v <= se.blackouts[b].end) v = se.blackouts[b].end
          }
          break
        case 'independent':
          s = 0
          invalid = true
          while(invalid && s < 1e4){
            s++
            v = Math.floor(start + Math.random() * (end - start + 1))
            invalid = false
            if(se.hasOwnProperty('blackouts')) for(b = se.blackouts.length; b--;){
              if(v >= se.blackouts[b].start && v <= se.blackouts[b].end){
                invalid = true
                break
              }
            }
            if(!invalid) for(b = se.times.length; b--;){
              if(Math.abs(v - se.times[b]) < p.minsep * 6e4){
                invalid = true
                break
              }
            }
          }
          break
        default:
          s = i ? s + binsize : start
          e = !i && se.hasOwnProperty('blackouts') ? n : Math.min(end, s + binsize)
          if(i && s - se.times[l + i - 1] < p.minsep * 6e4) s = se.times[l + i - 1] + p.minsep * 6e4
          if(se.hasOwnProperty('blackouts')){
            for(b = se.blackouts.length; b--;){
              if(i){
                if(s >= se.blackouts[b].start && s <= se.blackouts[b].end){
                  s = se.blackouts[b].end
                  if(e < s) e = s + p.minsep * 6e4
                }else if(e >= se.blackouts[b].start && (e <= se.blackouts[b].end || s <= se.blackouts[b].start)){
                  e = se.blackouts[b].start
                }
              }else{
                if(se.blackouts[b].start - start < p.minsep * 6e4){
                  start = s = se.blackouts[b].end
                }else if(end - se.blackouts[b].end < p.minsep * 6e4){
                  end = se.blackouts[b].start
                }else e = e + (se.blackouts[b].end - se.blackouts[b].start) / binsize
              }
            }
            if(!i){
              binsize = Math.floor((end - start) / e)
              e = Math.min(end, s + binsize)
            }
          }
          v = Math.floor(s + Math.random() * (e - s + 1))
      }
      se.times.push(v)
      se.statuses.push(1)
      if(v < io.first){
        io.first = v
      }else if(v > io.last){
        io.last = v
      }
    }
  }
}
function post_form(type, build_only){
  if(options.study){
    for(var stype = type + 's', e = page.scheduler[type].options.getElementsByTagName('input'), i = e.length, d, t, n, ct, cs, tr = [],
        sort = true, updated = false, k, u = {type: 'add_' + type, study: options.study, id: '', object: {}}; i--;){
      if(e[i].name){
        if(e[i].type === 'checkbox' || e[i].value){
          u.object[e[i].name] = e[i][e[i].type === 'checkbox' ? 'checked' : 'value']
          if(e[i].type === 'number') u.object[e[i].name] = parseFloat(u.object[e[i].name])
        }
        if(i === 0){
          u.id = u.object[e[i].name]
          if(!study[stype].hasOwnProperty(u.id)) updated = true
        }
      }
    }
    if(u.id){
      for(e = page.scheduler[type].options.getElementsByTagName('select'), i = e.length; i--;) if(e[i].name)
        u.object[e[i].name] = e[i].options[e[i].selectedIndex].innerText
      if(!updated) for(k in u.object) if(u.object.hasOwnProperty(k) && (!study[stype][u.id].hasOwnProperty(k) || u.object[k] !== study[stype][u.id][k])){
        updated = true
        break
      }
      if(type === 'participant'){
        if(!temp_schedule.schedule || !temp_schedule.protocols || !temp_schedule.daysofweek){
          sort = false
          make_schedule()
        }
        u.object.daysofweek = temp_schedule.daysofweek
        if(temp_schedule.hasOwnProperty('blackouts')) u.object.blackouts = temp_schedule.blackouts
        u.object.protocols = temp_schedule.protocols
        u.object.schedule = temp_schedule.schedule
        u.object.first = temp_schedule.first
        u.object.last = temp_schedule.last
        u.object.timezone = timezone
        if(temp_schedule.updated) updated = true
        page.scheduler.participant.submit.innerText = 'Add/update'
        page.scheduler.participant.submit.className = ''
      }
      u.object = Sanitize[type](u.object)
      if(build_only) return u
      if(!updated){
        notify({status: 'nothing to update'}, true)
        return
      }
      if(type === 'participant' && sort) for(d = temp_schedule.schedule.length; d--;){
        ct = temp_schedule.schedule[d].times
        if(ct.length > 1){
          for(i = ct.length - 1, sort = false, tr = [i], t = 0; i--;){
            for(t = tr.length; t--;) if(t === 0 || ct[i] > ct[tr[t]]){
              tr.splice(t + 1, 0, i)
              if(t) sort = true
              break
            }
          }
          if(sort){
            ct = [], cs = []
            for(n = tr.length, i = 0; i--;){
              ct.push(temp_schedule.schedule[d].times[tr[i]])
              cs.push(temp_schedule.schedule[d].statuses[tr[i]])
            }
            temp_schedule.schedule[d].times = ct
            temp_schedule.schedule[d].statuses = cs
          }
        }
      }
      request('/operation', function(d){
        study[stype][u.id] = u.object
        if(type === 'participant'){
          fill_selection(0)
          notify({status: (schedule.hasOwnProperty(u.id) ? 'updated ' : 'added ') + ' participant ' + u.id})
          schedule[u.id] = u.object
          options.id = ''
          backup()
          display_schedule()
          if(page.schedule_rows.hasOwnProperty(u.id)) page.schedule_rows[u.id].id.firstElementChild.firstElementChild.style.height =
            page.schedule_rows[u.id].entries.getBoundingClientRect().height + 'px'
          if(page.scheduler.frame.style.display === '') toggle_scheduler()
        }else{
          notify(d)
          if(type === 'user'){
            options.tab = 0
            backup()
            fill_selection(2)
            toggle_scheduler()
          }else{
            fill_selection(1)
            page.scheduler_tabs[0].click()
          }
        }
      }, function(d){
        notify(d)
      }, u)
    }else{
      notify({status: 'fill the first input to post'}, true)
    }
  }
}
function notify(s, redirect){
  if(s){
    var d, e
    if(s.status){
      d = s
    }else try{d = JSON.parse(s)}catch(e){}
    if(d && d.status){
      e = redirect ? page.scheduler.notification : page.latest_notification
      e.classList.remove('showing')
      e.innerText = d.status
      setTimeout(addshowing.bind(null, e), 10)
      if(!redirect){
        page.notifications.appendChild(e = document.createElement('tr'))
        e.appendChild(document.createElement('td'))
        e.lastElementChild.innerText = former.ftime.format(Date.now())
        e.appendChild(document.createElement('td'))
        e.lastElementChild.innerText = d.status
        page.notifications.lastElementChild.scrollIntoView()
      }
      if(d.hasOwnProperty('version') && d.version !== study.version){
        setTimeout(load_schedule, 20)
      }
    }
  }
}
function addshowing(e){
  e = e || page.latest_notification
  e.classList.add('showing')
}
function clear_notifications(){
  toggle_notifications()
  page.notifications.innerHTML = page.latest_notification.innerText = ''
}
function toggle_notifications(){
  page.notifications.parentElement.parentElement.classList[page.notifications.parentElement.parentElement.classList[1] === 'expanded' ? 'remove' : 'add']('expanded')
}
function sample(from, n){
	for(var r = from.length, res = [], i = 0; i < n; i++) res[i] = from[Math.floor(Math.random() * r)]
	return res
}
function shuffle(a){
  var r = a.length, i = 0, set = [], res = [], t = 0
	while(i < r) if(set.indexOf(t = Math.floor(Math.random() * r)) === -1){
		set.push(t)
		res.push(a[t])
    i++
	}
	return res
}
function demo_study(n){
  if(n && options.study === 'demo'){
    if(page.scheduler.frame.style.display === 'none') toggle_scheduler()
    genid(page.scheduler.participant.id.nextElementSibling)
    var base = post_form('participant', true)
    base.object.phone = 0
    study.participants = {}
    for(; n--;){
      base.object.id = genid()
      make_schedule(false, true)
      base.object.protocols = temp_schedule.protocols
      base.object.schedule = temp_schedule.schedule
      study.participants[base.object.id] = JSON.parse(JSON.stringify(base.object))
    }
    if(page.scheduler.frame.style.display === '') toggle_scheduler()
  }
}
function checkin_link(m, id, day, time){
  return m.replace(patterns.http, '<a onclick="checkin(' + id + ', ' + day + ', ' + time + ')">$2</a>')
}
function checkin(id, day, time){
  var s = study.participants[id].schedule[day], p = study.protocols[s.protocol]
  if(s.statuses[time] < 4 && Date.now() < s.times[time] + p.close_after * 6e4){
    s.statuses[time] += 2
    backup_demo()
    if(update_queue.hasOwnProperty(id)) delete update_queue[id]
    load_schedule()
    notify({status: 'checkin from participant ' + id + '[' + day + ']' + '[' + time + ']'})
  }
}
function add_blackout(){
  var e = page.scheduler.participant.blackouts, c
  e.appendChild(e = document.createElement('td'))
  e.appendChild(c = document.createElement('input'))
  c.type = 'date'
  c.addEventListener('change', update_blackout)
  e.appendChild(c = document.createElement('input'))
  c.type = 'date'
  c.addEventListener('change', update_blackout)
  e.appendChild(c = document.createElement('button'))
  c.type = 'button'
  c.addEventListener('click', remove_blackout)
  c.innerText = 'remove'
  temp_schedule.hasOwnProperty('blackouts') ? temp_schedule.blackouts.push({}) : temp_schedule.blackouts = [{}]
  if(temp_schedule.id && study.participants.hasOwnProperty(temp_schedule.id)) scheduler_status()
}
function update_blackout(e){
  var i = e.target.parentElement.cellIndex, v = e.target.value
  if(v && temp_schedule.hasOwnProperty('blackouts') && i < temp_schedule.blackouts.length){
    temp_schedule.blackouts[i][e.target.previousElementSibling ? 'end' : 'start'] = new Date(v.replace(patterns.numpunct, '')).setHours(24, 0, 0, 0)
  }
}
function remove_blackout(e){
  var i = e.target.parentElement.cellIndex
  if(temp_schedule.hasOwnProperty('blackouts') && i < temp_schedule.blackouts.length) temp_schedule.blackouts.splice(i, 1)
  e.target.parentElement.parentElement.removeChild(e.target.parentElement)
}
function toggle_active(e){
  if(e.className === 'active'){
    edit.active = false
    e.classList.remove('active')
    page.scheduler.notification.classList.remove('showing')
    if(page.menu_schedule.lastElementChild) page.menu_schedule.lastElementChild.lastElementChild.lastElementChild.classList.remove('active')
  }else{
    edit.active = e
    e.classList.add('active')
    notify({status: e.innerText === 'add blackout'
      ? 'Click and drag under a day to add a blackout range' : 'Click under a day to add a beep'}, true)
    if(page.menu_schedule.lastElementChild) page.menu_schedule.lastElementChild.lastElementChild.lastElementChild.classList.add('active')
  }
}
function show_time(e){
  if(!edit.holding){
    e = e.target
    if(e.tagName === 'P') e = e.parentElement
    if(e.tagName === 'DIV' && (e.className === 'blackout' || e.classList[0] === 'ping')){
      page.tick_editor.style.display = ''
      e.parentElement.appendChild(page.tick_editor)
      var b = e.getBoundingClientRect(), p = e.parentElement.parentElement.getBoundingClientRect(), ed = page.tick_editor.getBoundingClientRect(), s, i
      page.tick_editor.style.top = b.top + ed.height + 4 > p.bottom ? b.top - p.top - ed.height + 4 + 'px' : e.style.top
      page.tick_editor.style.left = (b.width > ed.width * 2 ? 0 : b.x - p.x < ed.width ? b.width : -ed.width) + 'px'
      s = temp_schedule.schedule[e.parentElement.cellIndex]
      if(e.className === 'blackout'){
        page.tick_editor.children[2].style.display = ''
        page.tick_editor.children[0].style.display = page.tick_editor.children[1].style.display = 'none'
        i = parseInt(e.children[1].innerText)
        page.tick_editor.children[2].firstElementChild.value = former.mtime.format(s.blackouts[i].start)
        page.tick_editor.children[2].children[1].value = former.mtime.format(s.blackouts[i].end)
        page.tick_editor.className = 'blackout_display'
      }else{
        page.tick_editor.children[0].style.display = ''
        page.tick_editor.children[1].style.display = page.tick_editor.children[2].style.display = 'none'
        i = parseInt(e.lastElementChild.innerText)
        page.tick_editor.firstElementChild.firstElementChild.value = former.mtime.format(s.times[i])
        page.tick_editor.firstElementChild.children[1].selectedIndex = names.status.length - 1 - s.statuses[i]
        page.tick_editor.className = names.status[s.statuses[i]]
      }
    }else if(!edit.holding){
      page.tick_editor.style.display = 'none'
      page.tick_editor.className = ''
    }
  }
}
function schedule_action_start(e){
  edit.moved = false
  if(e.which === 1 && !edit.e && (edit.active || (e.target.classList.contains('ping') || e.target.className === 'blackout' || e.target.parentElement.className === 'blackout'))){
    if(edit.active && e.target.tagName === 'TD'){
      edit.t = 0
      edit.b = e.target.getBoundingClientRect()
      if(edit.active.innerText === 'add beep'){
        var p = e.target.parentElement.getBoundingClientRect(), d = e.target.cellIndex, s = temp_schedule.schedule[d],
            v = e.clientY - edit.b.y, t = Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5), i = s.times.length
        edit.active.classList.remove('active')
        edit.holding = edit.active = false
        page.scheduler.notification.classList.remove('showing')
        page.menu_schedule.lastElementChild.lastElementChild.lastElementChild.classList.remove('active')
        s.times.push(t)
        s.statuses.push(1)
        e.target.appendChild(edit.e = document.createElement('div'))
        edit.e.className = 'ping pending'
        edit.e.appendChild(document.createElement('p'))
        edit.e.lastElementChild.innerText = former.mtime.format(t)
        edit.e.appendChild(document.createElement('p'))
        edit.e.lastElementChild.innerText = 'pending'
        edit.e.appendChild(document.createElement('p'))
        edit.e.lastElementChild.className = 'index'
        edit.e.lastElementChild.innerText = i
        edit.e.style.top = e.clientY - edit.b.y + 'px'
        show_time({target: edit.e})
        edit.moved = true
        edit.holding = edit.e
      }else{
        var d = e.target.cellIndex, s = temp_schedule.schedule[d], v = e.clientY - edit.b.y
        if(!s.hasOwnProperty('blackouts')) s.blackouts = []
        s.blackouts.push({start: Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5)})
        edit.e = display_blackout(temp_schedule.id, s, s.blackouts.length - 1, v, e.target)
        show_time({target: edit.e})
        edit.holding = edit.e
      }
    }else if(e.target.tagName === 'DIV' || e.target.tagName === 'P'){
      if(e.target.tagName === 'DIV'){
        edit.t = 1
        edit.e = e.target
        if(edit.holding !== edit.e) edit.holding = false
        show_time(e)
      }else{
        edit.t = e.target.nextElementSibling ? 2 : 0
        edit.e = e.target.parentElement
      }
      edit.active = e.target
    }
    if(edit.active){
      edit.p = edit.e.parentElement.getBoundingClientRect()
      edit.b = edit.e.getBoundingClientRect()
      edit.b.init = e.clientY
      edit.b.offset = e.clientY - edit.b.y
      edit.b.ntop = edit.b.top
      edit.b.nbottom = edit.b.bottom
    }
  }
}
function schedule_action_update(){
  if(edit.holding){
    if(edit.holding.tagName === 'TD'){
      var td, v, i, a, d = edit.holding.cellIndex, c = page.tick_editor.children[1],
          t = new Date(c.firstElementChild.value.replace(patterns.numpunct, '')).setHours(24, 0, 0, 0)
      if(temp_schedule.schedule.length <= d){
        temp_schedule.schedule.push({date: t, day: d, times: [], statuses: []})
      }else temp_schedule.schedule[d].date = t
      edit.holding.className = edit.holding.children[1].innerText = page.tick_editor.className = temp_schedule.schedule[d].protocol =
        c.lastElementChild.options[c.lastElementChild.selectedIndex].value
      edit.holding.firstElementChild.innerText = former.day.format(t)
    }else{
      var d = edit.holding.parentElement.cellIndex, i, t, s = names.status.length - 1 - page.tick_editor.firstElementChild.lastElementChild.selectedIndex,
          se, ed = page.tick_editor.getBoundingClientRect(), p = edit.holding.parentElement.getBoundingClientRect(), w = -ed.width, b
      if(temp_schedule.start_time > t){
        if(t + 864e5 > temp_schedule.end_time){
          t = temp_schedule.start_time
        }else{
          t = t += 864e5
          if(temp_schedule.start_time > t) t = temp_schedule.start_time
        }
      }
      if(t > temp_schedule.end_time) t = temp_schedule.end_time
      se = temp_schedule.schedule[d]
      if(edit.holding.className === 'blackout'){
        i = parseInt(edit.holding.children[1].innerText)
        t = toMs(page.tick_editor.children[2].children[0].value)
        se.blackouts[i].start = se.date + t
        se.blackouts[i].end = se.date + toMs(page.tick_editor.children[2].children[1].value)
        edit.holding.style.height = (se.blackouts[i].end - se.blackouts[i].start) * 360 / 864e5 + 'px'
      }else{
        i = parseInt(edit.holding.lastElementChild.innerText)
        t = toMs(page.tick_editor.firstElementChild.firstElementChild.value)
        se.statuses[i] = s
        se.times[i] = se.date + t
        edit.holding.classList.replace(edit.holding.classList[1], names.status[s])
        page.tick_editor.className = names.status[s]
      }
      edit.holding.style.top = (t - temp_schedule.start_time) * 360 / 864e5 + 'px'
      b = edit.holding.getBoundingClientRect()
      page.tick_editor.style.top = b.top + ed.height + 4 > p.bottom ? b.top - p.top - ed.height + 4 + 'px' : edit.holding.style.top
      page.tick_editor.style.left = (b.width > ed.width * 2 ? 0 : b.x - p.x < ed.width ? b.width : -ed.width) + 'px'
    }
    scheduler_status()
  }
}
function scheduler_edit_button(){
  if(edit.holding){
    if(temp_schedule.id && study.participants.hasOwnProperty(temp_schedule.id)){
      var d = edit.holding.parentElement.cellIndex, i = parseInt(edit.holding.lastElementChild.innerText)
      temp_schedule.schedule[d].times[i] = study.participants[temp_schedule.id].schedule[d].times[i]
      temp_schedule.schedule[d].statuses[i] = study.participants[temp_schedule.id].schedule[d].statuses[i]
      edit.moved = true
      edit.e = edit.holding
      edit.e.style.top = (temp_schedule.schedule[d].times[i] - temp_schedule.schedule[d].date - temp_schedule.start_time) * 360 / 864e5 + 'px'
      edit.e.classList.replace(edit.e.classList[1], names.status[temp_schedule.schedule[d].statuses[i]])
      edit.holding = false
      show_time({target: edit.e})
      schedule_action_end({which: 1, target: edit.e})
    }else{
      notify({status: 'No saved schedule to revert to'}, true)
    }
  }
}
function schedule_action_move(e){
  if(edit.e){
    if(e.clientY < edit.p.top || e.clientY + .6 > edit.p.bottom){
      schedule_action_end({which: 1, target: edit.e})
      return
    }
    var v = e.clientY - edit.b.init, s = temp_schedule.schedule[edit.e.parentElement.cellIndex], i, t
    switch(edit.t){
      case 1:
        edit.b.ntop = edit.b.top + v
        edit.b.nbottom = edit.b.bottom + v
        if(edit.b.nbottom < edit.p.bottom && edit.b.ntop > edit.p.top){
          v = edit.b.ntop - edit.p.top
          edit.e.style.top = v + 'px'
          page.tick_editor.style.top = (v + 102 > edit.p.bottom - edit.p.top ? v - 98 : v) + 'px'
          if(edit.e.className === 'blackout'){
            i = parseInt(edit.e.children[1].innerText)
            s.blackouts[i].start = Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5)
            s.blackouts[i].end = Math.floor(s.date + temp_schedule.start_time + (v + edit.b.height) / 360 * 864e5)
            page.tick_editor.children[2].children[0].value = former.mtime.format(s.blackouts[i].start)
            page.tick_editor.children[2].children[1].value = former.mtime.format(s.blackouts[i].end)
          }else{
            s.times[parseInt(edit.e.lastElementChild.innerText)] = v = Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5)
            page.tick_editor.firstElementChild.firstElementChild.value = former.mtime.format(v)
          }
          edit.moved = true
        }
        break
      case 2:
        edit.b.ntop = edit.b.top + v
        if(edit.b.ntop > edit.p.top && edit.b.height - v > 0){
          i = parseInt(edit.e.children[1].innerText)
          edit.e.style.height = edit.b.height - v + 'px'
          v = edit.b.ntop - edit.p.top
          edit.e.style.top = v + 'px'
          page.tick_editor.style.top = (v + 102 > edit.p.bottom - edit.p.top ? v - 98 : v) + 'px'
          s.blackouts[i].start = Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5)
          page.tick_editor.children[2].children[0].value = former.mtime.format(s.blackouts[i].start)
          edit.moved = true
        }
        break
      case 0:
        edit.b.nbottom = edit.b.bottom + v
        if(edit.b.nbottom < edit.p.bottom && edit.b.height + v > 0){
          v = edit.b.height + v, i = parseInt(edit.e.children[1].innerText)
          edit.e.style.height = v + 'px'
          s.blackouts[i].end = Math.floor(s.date + temp_schedule.start_time + v / 360 * 864e5)
          page.tick_editor.children[2].children[1].value = former.mtime.format(s.blackouts[i].end)
          edit.moved = true
        }
        break
      default:
        edit.e = false
    }
  }
}
function schedule_action_end(e){
  if(e.which === 1){
    e = e.target
    if(e.tagName === 'P') e = e.parentElement
    if(edit.holding && e.tagName === 'BUTTON' && e.parentElement.parentElement.id === 'tick_editor'){
      var d = edit.holding.parentElement.cellIndex, i, p
      if(edit.holding){
        if(e.innerText === 'revert'){
          if(temp_schedule.id && study.participants.hasOwnProperty(temp_schedule.id)){
            if(page.tick_editor.parentElement.parentElement.rowIndex === 0){
              d = edit.holding.cellIndex
              p = study.participants[temp_schedule.id].schedule[d]
              temp_schedule.schedule[d].date = p.date
              temp_schedule.schedule[d].protocol = p.protocol
              edit.holding.firstElementChild.innerText = former.day.format(p.date)
              edit.holding.className = edit.holding.children[1].innerText = p.protocol
              schedule_action_end({which: 1, target: edit.holding})
            }else{
              edit.e = edit.holding
              edit.holding = false
              if(edit.e.className === 'blackout'){
                i = parseInt(edit.e.children[1].innerText)
                temp_schedule.schedule[d].blackouts[i].start = study.participants[temp_schedule.id].schedule[d].blackouts[i].start
                temp_schedule.schedule[d].blackouts[i].end = study.participants[temp_schedule.id].schedule[d].blackouts[i].end
              }else{
                i = parseInt(edit.e.lastElementChild.innerText)
                temp_schedule.schedule[d].times[i] = study.participants[temp_schedule.id].schedule[d].times[i]
                temp_schedule.schedule[d].statuses[i] = study.participants[temp_schedule.id].schedule[d].statuses[i]
                edit.moved = true
                edit.e.style.top = (temp_schedule.schedule[d].times[i] - temp_schedule.schedule[d].date - temp_schedule.start_time) * 360 / 864e5 + 'px'
                edit.e.classList.replace(edit.e.classList[1], names.status[temp_schedule.schedule[d].statuses[i]])
              }
              show_time({target: edit.e})
              edit.holding = edit.e
              schedule_action_update()
              edit.holding = false
              schedule_action_end({which: 1, target: edit.e})
            }
          }else{
            notify({status: 'No saved schedule to revert to'}, true)
          }
        }else if(e.innerText === 'remove'){
          if(page.tick_editor.parentElement.parentElement.rowIndex === 0){
            d = page.tick_editor.parentElement.cellIndex
            temp_schedule.schedule.splice(d, 1)
            for(i = 4; i--;) page.menu_schedule.firstElementChild.firstElementChild.children[i].removeChild(page.menu_schedule.firstElementChild.firstElementChild.children[i].children[d])
          }else if(edit.holding.className === 'blackout'){
            temp_schedule.schedule[d].blackouts.splice(parseInt(edit.holding.children[1].innerText), 1)
            edit.holding.parentElement.removeChild(edit.holding)
          }else if(!isNaN(i)){
            temp_schedule.schedule[d].times.splice(i, 1)
            temp_schedule.schedule[d].statuses.splice(i, 1)
            edit.holding.parentElement.removeChild(edit.holding)
          }
          edit.holding = edit.e = edit.moved = false
          page.tick_editor.style.display = 'none'
          scheduler_status()
        }
      }
    }else if(e.tagName === 'BUTTON' || (!edit.active && e.tagName === 'TD')){
      e = e
      if(e.parentElement.rowIndex === 0){
        if(e === edit.holding){
          edit.holding = false
        }else{
          var b, bp, s, eb
          page.tick_editor.children[0].style.display = page.tick_editor.children[2].style.display = 'none'
          page.tick_editor.children[1].style.display = ''
          if(!temp_schedule.hasOwnProperty('schedule')) make_schedule(true, true)
          page.tick_editor.children[1].firstElementChild.value = former.dashdate(temp_schedule.schedule.length
            ? temp_schedule.schedule.length > e.cellIndex ? temp_schedule.schedule[e.cellIndex].date
            : temp_schedule.schedule[temp_schedule.schedule.length - 1].date + 864e5 : Date.now())
          page.tick_editor.children[1].children[1].selectedIndex = s - names.status.indexOf(e.children[1].innerText)
          for(i = page.tick_editor.children[1].children[1].children.length; i--;) if(e.children[1].innerText === page.tick_editor.children[1].children[1].children[i].value){
            page.tick_editor.children[1].children[1].selectedIndex = i
            break
          }
          page.tick_editor.className = e.className
          page.tick_editor.style.display = ''
          e.appendChild(page.tick_editor)
          b = e.getBoundingClientRect()
          bp = e.parentElement.getBoundingClientRect()
          eb = page.tick_editor.getBoundingClientRect()
          page.tick_editor.style.top = b.top - bp.top + 'px'
          page.tick_editor.style.left = (b.x - bp.x < eb.width ? b.width : -eb.width) + 'px'
          edit.holding = e
        }
      }else if(e.tagName === 'BUTTON'){
        var v, i, s, st, nt, dt, u, h = e.parentElement.cellIndex, c = page.menu_schedule.lastElementChild.firstElementChild.lastElementChild.children[h]
        if(e.innerText === '↻'){
          u = true
          edit.e = edit.holding
          edit.holding = false
          temp_schedule.schedule[h].times = []
          temp_schedule.schedule[h].statuses = []
          roll_times(h, study.protocols[temp_schedule.schedule[h].protocol], temp_schedule)
          c.innerHTML = ''
          c.style.height = page.menu_timeline.style.height = 15 + (temp_schedule.end_time - temp_schedule.start_time) * 360 / 864e5 + 'px'
          page.menu_timeline.style.backgroundPositionY = -temp_schedule.start_time * 360 / 864e5 + 'px'
          for(v = study.protocols[temp_schedule.schedule[h].protocol].beeps, i = 0; i < v; i++) display_time(
            temp_schedule.id, temp_schedule.schedule[h].times[i] - (temp_schedule.schedule[h].date + temp_schedule.start_time), c,
            i, temp_schedule.schedule[h].statuses[i]
          )
          if(temp_schedule.schedule[h].hasOwnProperty('blackouts')) for(i = temp_schedule.schedule[h].blackouts.length; i--;){
            if(edit.e && edit.e.className === 'blackout' && edit.e.children[1].innerText == i){
              c.appendChild(edit.e)
              show_time({target: edit.e})
              edit.holding = edit.e
              edit.e = false
            }else{
              display_blackout(
                temp_schedule.id, temp_schedule.schedule[h], i, (temp_schedule.schedule[h].blackouts[i].start - (temp_schedule.schedule[h].date +
                  temp_schedule.start_time)) * 360 / 864e5, c
              )
            }
          }
          c = page.menu_schedule.lastElementChild.lastElementChild.children[1].children[h].firstElementChild
          c.innerText = c.className = 'pause'
        }else{
          if(e.innerText === 'pause'){
            st = 'pending'
            nt = 'pause'
            dt = 'unpause'
          }else{
            dt = st = 'pause'
            nt = 'pending'
          }
          s = names.status.indexOf(e.innerText === 'pause' ? 'pause' : 'pending')
          for(i = c.childElementCount, u = false; i--;) if(c.children[i].children[1].innerText === st){
            c.children[i].children[1].innerText = nt
            c.children[i].classList.replace(c.children[i].classList[1], nt)
            temp_schedule.schedule[h].statuses[i] = s
            u = true
          }
          if(u){
            e.innerText = dt
            e.className = st
          }else{
            e.innerText = e.className = 'pause'
            notify({status: 'No pending beeps to pause'}, true)
          }
        }
        if(u) scheduler_status()
      }else if(!edit.moved){
        page.tick_editor.style.display = 'none'
        page.tick_editor.className = ''
        edit.holding = false
      }
    }else if(edit.active || e.classList.contains('ping') || e.className === 'blackout' || e.parentElement.className === 'blackout'){
      if(edit.active){
        if(edit.e.className === 'blackout'){
          var d = edit.e.parentElement.cellIndex, i = parseInt(edit.e.children[1].innerText), s = temp_schedule.schedule[d],
              b =  edit.e.getBoundingClientRect(), p = edit.e.parentElement.getBoundingClientRect(), t
          s.blackouts[i].start = Math.floor(s.date + temp_schedule.start_time + (b.top - p.top) / 360 * 864e5)
          s.blackouts[i].end = Math.floor(s.blackouts[i].start + b.height / 360 * 864e5)
          if(s.blackouts[i].start > s.blackouts[i].end - 12e5){
            s.blackouts[i].end = s.blackouts[i].start + 12e5
            edit.holding = false
            show_time({target: edit.e})
            edit.holding = edit.e
            schedule_action_update()
          }
          for(t = s.times.length; t--;) if(s.times[t] >= s.blackouts[i].start && s.times[t] <= s.blackouts[i].end){
            setTimeout(schedule_action_end.bind(null, {
              which: 1,
              target: edit.e.parentElement.parentElement.previousElementSibling.children[d].firstElementChild
            }), 10)
            break
          }
          scheduler_status()
        }
        edit.active.classList.remove('active')
        edit.active = false
        page.scheduler.notification.classList.remove('showing')
        page.menu_schedule.lastElementChild.lastElementChild.lastElementChild.classList.remove('active')
      }
      if(edit.e){
        if(edit.e.tagName === 'TD' || edit.e.className === 'blackout' || edit.e.classList[0] === 'ping'){
          if(edit.holding === edit.e){
            if(!edit.moved){
              edit.holding = false
            }else scheduler_status()
          }else if(edit.moved || !edit.holding){
            if(edit.moved) scheduler_status()
            edit.holding = false
            show_time({target: edit.e})
            edit.holding = edit.e
          }
        }
        edit.e = false
      }
    }
  }
}
function make_timeline_background(){
  for(var s = "<svg xmlns='http://www.w3.org/2000/svg' " +
     "viewBox='0 0 9999 999' style='background: #292929; width: 9999px'>" +
     "<style>line{stroke: #3e3e3e}text{font: 14px monospace; fill: #bdbdbd}</style>",
      i = 0, y = 0, h = 12, am = false, n = 36; i < n; i++){
    s += "<line x1='0' x2='9999' y1='" + y + "' y2='" + y + "'/><text x='60' y='" + (y + 12) + "'>" + ((h < 10 ? '0' + h : h) + (am ? ' am' : ' pm')) + "</text>"
    if(++h > 12){
      h = 1
      am = !am
    }
    y += 15
  }
  s += '</svg>'
  return s
}
