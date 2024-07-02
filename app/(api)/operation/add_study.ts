import {createTable, updateTable} from '@/lib/database'
import {User} from '@/lib/user'
import {Study} from '@/lib/studies'
import {studies} from '@/app/store'
import {log} from '@/utils/log'

export async function addStudy(user: string, name: string) {
  let status = 'failed to add study ' + name + ': unknown'
  try {
    const createRequest = await createTable(name, 'id')
    if (createRequest.$metadata.httpStatusCode === 200) {
      const newStudy = new Study(name)
      newStudy.users[user] = new User()
      try {
        const updateRequest = await updateTable('studies', newStudy.export())
        if (updateRequest.$metadata.httpStatusCode === 200) {
          studies[name] = newStudy
          status = 'success'
        } else {
          status = 'failed to make update studies table request: HTTP status ' + updateRequest.$metadata.httpStatusCode
        }
      } catch (e) {
        status = 'failed to update studies table: ' + e
      }
    } else {
      status = 'failed to make add study request: HTTP status ' + createRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to add study ' + name + ': ' + e
  }
  log('sessions', status === 'success' ? 'added study ' + name : status)
  return status
}
