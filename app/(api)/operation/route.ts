import {NextRequest} from 'next/server'
import {listLogs} from './list_logs'
import {readLog} from './view_logs'
import {listStudies} from './list_studies'
import {Operations} from '@/utils/operation'
import {addStudy} from './add_study'
import {removeStudy} from './remove_study'
import {listUsers} from './list_users'
import {addUser} from './add_user'
import {removeUser} from './remove_user'
import {listProtocols} from './list_protocols'
import {addProtocol} from './add_protocol'
import {removeProtocol} from './remove_protocol'
import {listParticipants} from './list_participants'
import useStore from '@/app/store'

const openAccess = {
  load_schedule: true,
  rescan: true,
  list_logs: true,
}
const logActions = {
  list_logs: true,
  view_log: true,
}

export async function POST(request: NextRequest) {
  const {studies, sessions} = useStore()
  const req = (await request.json()) as Operations
  const id = request.cookies.get('id')
  const session = id && sessions.get(id.value)
  if (id && session) {
    const username = session.payload ? session.payload.username : ''
    if ('list_studies' === req.type) {
      const studies = username ? await listStudies(username) : []
      return Response.json(studies)
    } else if (
      req.study === 'sessions' &&
      req.type in logActions &&
      (username === process.env.ADMIN || username === 'test_user')
    ) {
      switch (req.type) {
        case 'list_logs':
          return Response.json(await listLogs(req.study + ''))
        case 'view_log':
          return Response.json(await readLog(req.file + ''))
      }
    } else if (session.payload && req.study in studies) {
      const perms = studies[req.study].users[username]
      if (!perms || (!(req.type in openAccess) && !perms[req.type as keyof typeof perms])) {
        return new Response(null, {status: 403})
      }
      let status = 'failed'
      switch (req.type) {
        case 'list_logs':
          const logs = await listLogs(req.study + '')
          return Response.json(logs)
        case 'view_log':
          const logContent = await readLog(req.file + '')
          return Response.json(logContent)
        case 'add_study':
          return Response.json(await addStudy(username, req.study + ''))
        case 'remove_study':
          status = await removeStudy(req.study + '')
          return Response.json(status, {status: status === 'success' ? 200 : 500})
        case 'view_user':
          const users = await listUsers(req.study + '')
          return Response.json(users)
        case 'add_user':
          return Response.json(await addUser(req.study + '', req.name + '', req.perms))
        case 'remove_user':
          status = await removeUser(req.study + '', req.name + '')
          return Response.json(status, {status: status === 'success' ? 200 : 500})
        case 'view_protocol':
          const protocols = await listProtocols(req.study + '')
          return Response.json(protocols)
        case 'add_protocol':
          return Response.json(await addProtocol(req.study + '', req.name + '', req.params))
        case 'remove_protocol':
          status = await removeProtocol(req.study + '', req.name + '')
          return Response.json(status, {status: status === 'success' ? 200 : 500})
        case 'view_participant':
          const participants = await listParticipants(req.study + '')
          return Response.json(participants)
        default:
          return new Response(null, {status: 405})
      }
    } else {
      return new Response(null, {status: 406})
    }
  } else {
    return new Response(null, {status: 401})
  }
}
