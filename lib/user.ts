import sanitize from '@/utils/sanitize'
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'

export class User {
  email = ''
  add_study = false
  remove_study = false
  view_participant = false
  add_participant = false
  remove_participant = false
  view_protocol = false
  add_protocol = false
  remove_protocol = false
  view_user = false
  add_user = false
  remove_user = false
  view_log = false
  constructor(user?: Partial<User>) {
    if (user) {
      const o = Object(user)
      if ('email' in o) this.email = sanitize.make('email', '' + o.email)
      ;(
        [
          'add_study',
          'remove_study',
          'view_participant',
          'add_participant',
          'remove_participant',
          'view_protocol',
          'add_protocol',
          'remove_protocol',
          'view_user',
          'add_user',
          'remove_user',
          'view_log',
        ] as (keyof User)[]
      ).forEach(k => {
        if (k in o) this[k as 'add_study'] = 'string' === typeof o[k] ? 'true' === o[k] : !!o[k]
      })
    }
  }
  export() {
    const res: Partial<User> = {}
    Object.keys(this).forEach(k => {
      ;(res[k as keyof User] as boolean) = this[k as keyof User] as boolean
    })
    return res
  }
}

export type Users = {[index: string]: User}

const cognito = new CognitoIdentityProviderClient({region: process.env.REGION || 'us-east-1'})

export function cognitoAddUser(Username: string) {
  return cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: process.env.USERPOOL,
      Username,
      UserAttributes: [{Name: 'email', Value: Username}],
    })
  )
}
export function cognitoGetUser(Username: string) {
  return cognito.send(new AdminGetUserCommand({UserPoolId: process.env.USERPOOL, Username}))
}

export function cognitoDeleteUser(Username: string) {
  return cognito.send(new AdminDeleteUserCommand({UserPoolId: process.env.USERPOOL, Username}))
}
