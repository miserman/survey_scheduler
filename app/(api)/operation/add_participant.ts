import {updateTable} from '@/lib/database'
import useStore from '@/app/store'
import {log} from '@/utils/log'
import Participant from '@/lib/participant'

export async function addParticipant(study: string, id: string, participant: Participant) {
  const {studies} = useStore()
  const s = studies[study]
  const existing = id in s.participants
  const action = existing ? 'update' : 'add'
  let status = 'failed to ' + action + ' participant ' + id + ' to study ' + study + ': unknown'
  try {
    const updateRequest = await updateTable(study, participant)
    if (updateRequest.$metadata.httpStatusCode === 200) {
      const original = s.dbcopy.Items.findIndex(p => p.id === id)
      if (original === -1) {
        s.dbcopy.Items.push(participant)
      } else {
        s.dbcopy.Items[original] = participant
      }
      s.participants[id] = participant
      status = 'success'
    } else {
      status =
        'failed to make ' + action + ' participant request: HTTP status ' + updateRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to ' + action + ' participant ' + id + ' to study ' + study + ': ' + e
  }
  log(
    'sessions',
    status === 'success' ? (existing ? 'updated' : 'added') + ' participant ' + id + ' to study ' + study : status
  )
  return status
}
