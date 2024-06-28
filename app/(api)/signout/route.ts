import {log} from '@/utils/log'
import {NextRequest} from 'next/server'
import {sessions} from '../../store/sessions'
import {redirect} from 'next/navigation'

export async function GET(request: NextRequest) {
  const id = request.cookies.get('id')
  const session = id && sessions.get(id.value)
  if (id && session) {
    const {payload} = session
    const ip = request.ip || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')
    log('sessions', 'sign-out from ' + ip + ' (' + (payload ? payload.username : 'unknown') + ')')
    sessions.delete(id.value)
  } else {
    log('sessions', 'sign-out with session id ' + (id ? 'present but not on record: ' + id.value : 'not present'))
  }
  return redirect('/')
}
