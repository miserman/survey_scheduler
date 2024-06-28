import {sessions} from '@/app/store/sessions'
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
import {studies} from '@/app/store/studies'

const openAccess = {
  load_schedule: true,
  rescan: true,
  list_logs: true,
}

export async function POST(request: NextRequest) {
  const req = (await request.json()) as Operations
  const id = request.cookies.get('id')
  const session = id && sessions.get(id.value)
  if (id && session) {
    if ('list_studies' === req.type) {
      const studies = session.payload ? await listStudies(session.payload.username) : []
      return Response.json(studies)
    } else if (session.payload && req.study in studies) {
      const perms = studies[req.study].users[session.payload.username]
      if (!perms || (!(req.type in openAccess) && !perms[req.type as keyof typeof perms])) {
        return new Response(null, {status: 403})
      }
      switch (req.type) {
        case 'list_logs':
          const logs = await listLogs(req.prefix + '')
          return Response.json(logs)
        case 'view_log':
          const logContent = await readLog(req.file + '')
          return Response.json(logContent)
        case 'add_study':
          return Response.json(
            session.payload
              ? await addStudy(session.payload.username, req.study + '')
              : 'failed to add study: not a valid user'
          )
        case 'remove_study':
          return Response.json(await removeStudy(req.study + ''))
        case 'list_users':
          const users = await listUsers(req.study + '')
          return Response.json(users)
        case 'add_user':
          return Response.json(await addUser(req.study + '', req.name + '', req.perms))
        case 'add_user':
          return Response.json(await removeUser(req.study + '', req.name + ''))
        default:
          return new Response(null, {status: 405})
      }
    }
  } else {
    return new Response(null, {status: 401})
  }
}
