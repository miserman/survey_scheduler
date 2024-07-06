import {deleteTable, removeItem} from '@/lib/database'
import {log} from '@/utils/log'

export async function removeStudy(name: string) {
  let status = 'failed to remove study ' + name + ': unknown'
  try {
    const removeRequest = await deleteTable(name)
    if (removeRequest.$metadata.httpStatusCode === 200) {
      try {
        const updateRequest = await removeItem('studies', {study: name})
        if (updateRequest.$metadata.httpStatusCode === 200) {
          status = 'success'
        } else {
          status =
            'failed to make studies table removal request after deleting study ' +
            name +
            ': HTTP status ' +
            updateRequest.$metadata.httpStatusCode
        }
      } catch (e) {
        status = 'failed to remove study ' + name + ' from studies table: ' + e
      }
    } else {
      status = 'failed to make delete request for ' + name + ': HTTP status ' + removeRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to remove study ' + name + ': ' + e
  }
  log('sessions', status === 'success' ? 'removed study ' + name : status)
  return status
}
