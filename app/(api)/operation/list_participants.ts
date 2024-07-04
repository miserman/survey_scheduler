import useStore from '@/app/store'
import {log} from '@/utils/log'

export async function listParticipants(study: string) {
  const {studies, studiesStatus} = useStore()
  await studiesStatus.studies_table_scanned
  await studiesStatus[study]
  if (study in studies) {
    const {participants} = studies[study]
    log(study, 'listed participants of study ' + study)
    return participants
  } else {
    log(study, 'failed to list participants of study ' + study)
    return {}
  }
}
