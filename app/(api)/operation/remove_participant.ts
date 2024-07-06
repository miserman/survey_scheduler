import {removeItem} from '@/lib/database'
import {log} from '@/utils/log'

export async function removeParticipant(study: string, id: string) {
  let status = 'failed to remove participant ' + id + ' from study ' + study + ': unknown'
  try {
    const updateRequest = await removeItem(study, {id})
    if (updateRequest.$metadata.httpStatusCode === 200) {
      status = 'success'
    } else {
      status = 'failed to make participant removal request : HTTP status ' + updateRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to remove participant ' + id + ' from study ' + study + ': ' + e
  }
  log('sessions', status === 'success' ? 'removed participant ' + id + ' from study ' + study : status)
  return status
}
