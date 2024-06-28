import {cookieOptions} from '@/utils/defaults'
import {randomBytes} from 'crypto'
import {cookies} from 'next/headers'
import {type NextRequest} from 'next/server'
import {sessions} from '@/app/store/sessions'
import {log} from '@/utils/log'
import {redirect} from 'next/navigation'

const {DOMAIN, REGION, REDIRECT, CLIENT} = process.env

async function establishSession(request: NextRequest, development: boolean) {
  const state = request.nextUrl.searchParams.get('state')
  const cookieState = request.cookies.get('id')
  if (state && cookieState && state === cookieState.value) {
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
      let id = randomBytes(36).toString('hex')
      while (!!sessions.get(id)) id = randomBytes(36).toString('hex')
      cookies().set('id', id, cookieOptions)
      if (development) {
        const session = sessions.create(id)
        session.payload = {username: 'test_user'}
        session.verified = true
      } else {
        const body = 'grant_type=authorization_code&redirect_uri=' + REDIRECT + '&client_id=' + CLIENT + '&code=' + code
        const res = await fetch('https://' + DOMAIN + '.auth.' + REGION + '.amazoncognito.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': '' + Buffer.byteLength(body),
          },
          body,
        })
        if (res) {
          const tokens = await res.json()
          if ('access_token' in tokens && 'string' === typeof tokens.access_token) {
            const session = sessions.create(id)
            session.tokens = tokens
            session.verify()
            log('sessions', 'session established: ' + id)
            return true
          } else {
            console.error('invalid tokens object')
          }
        } else {
          console.error('failed to retrieve auth tokens')
        }
      }
    } else {
      log('sessions', 'auth request with no code: ' + cookieState)
    }
  } else {
    log('sessions', 'auth request with no or mismatched state: ' + cookieState)
  }
  return false
}

export async function GET(request: NextRequest) {
  await establishSession(request, process.env.NODE_ENV === 'development')
  return redirect('/')
}
