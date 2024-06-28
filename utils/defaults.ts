import {randomBytes} from 'crypto'

export const cookieOptions = {
  signed: true,
  secure: true,
  httpOnly: true,
  secret: randomBytes(36).toString('hex'),
  sameSite: 'strict' as 'strict' | 'lax',
}
