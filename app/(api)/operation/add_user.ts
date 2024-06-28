import {updateStudyUser} from '@/lib/database'
import {User, cognitoAddUser} from '@/lib/user'
import {studies} from '@/app/store/studies'
import {log} from '@/utils/log'

export async function addUser(study: string, name: string, perms: User) {
  let status = 'failed to add user ' + name + ' to study ' + study + ': unknown'
  const user = new User(perms)
  try {
    const cognitoRequest = await cognitoAddUser(name)
    if (cognitoRequest.$metadata.httpStatusCode === 200) {
      try {
        const createRequest = await updateStudyUser(study, name, user.export())
        if (createRequest.$metadata.httpStatusCode === 200) {
          console.log(cognitoRequest.User)
          studies[study].users[name] = user
          status = 'success'
        } else {
          status = 'failed to make add user request: HTTP status ' + createRequest.$metadata.httpStatusCode
        }
      } catch (e) {
        status = 'failed to add user ' + name + ' to study ' + study + ': ' + e
      }
    } else {
      status = 'failed to make Cognito request: HTTP status ' + cognitoRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to add user ' + name + ' to Cognito' + ': ' + e
  }
  log('sessions', status === 'success' ? 'added user ' + name + ' to study ' + study : status)
  return status
}
