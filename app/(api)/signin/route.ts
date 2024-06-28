import {log} from '@/utils/log'
import {cookieOptions} from '@/utils/defaults'
import {randomBytes} from 'crypto'
import {cookies} from 'next/headers'
import type {NextRequest} from 'next/server'
import {redirect} from 'next/navigation'

const {DOMAIN, REGION, REDIRECT, CLIENT} = process.env
const authURLComponents = DOMAIN && REGION && REDIRECT && CLIENT
export async function GET(request: NextRequest) {
  let state = randomBytes(50).toString('hex')
  cookies().set('id', state, {...cookieOptions, sameSite: 'lax'})
  const ip = request.ip || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')
  log('sessions', 'sign-in attempt from ' + ip + ' with' + (authURLComponents ? '' : 'out') + ' auth URL components')
  return process.env.NODE_ENV === 'development'
    ? redirect('/auth?code=test&state=' + state)
    : authURLComponents
    ? Response.redirect(
        'https://' +
          DOMAIN +
          '.auth.' +
          REGION +
          '.amazoncognito.com/login?response_type=code&scope=email&redirect_uri=' +
          REDIRECT +
          '&state=' +
          state +
          '&client_id=' +
          CLIENT
      )
    : redirect('/')
}
