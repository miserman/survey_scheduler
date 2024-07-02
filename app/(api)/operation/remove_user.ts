import {removeStudyUser} from '@/lib/database'
import {studies} from '@/app/store'
import {log} from '@/utils/log'

export async function removeUser(study: string, name: string) {
  let status = 'failed to remove user ' + name + ' from study ' + study + ': unknown'
  try {
    const createRequest = await removeStudyUser(study, name)
    if (createRequest.$metadata.httpStatusCode === 200) {
      delete studies[study].users[name]
      status = 'success'
    } else {
      status = 'failed to make remove user request: HTTP status ' + createRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to remove user ' + name + ' from study ' + study + ': ' + e
  }
  log(study, status === 'success' ? 'removed user ' + name + ' from study ' + study : status)
  return status
}
