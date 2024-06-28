import {cookies} from 'next/headers'
import {sessions} from '@/app/store/sessions'
import {MS_HOUR} from '@/utils/times'
import {log} from '@/utils/log'

export async function GET() {
  const res = {signedin: false, expires: Date.now() + MS_HOUR}
  const id = cookies().get('id')
  if (id && id.value) {
    const session = sessions.get(id.value)
    if (session) {
      session.expires = res.expires
      res.signedin = true
      log('sessions', 'session refreshed: ' + id.value)
    } else {
      log('sessions', 'session with no record: ' + id.value)
    }
  } else {
    log('sessions', 'session with no id')
  }
  return Response.json(res)
}
