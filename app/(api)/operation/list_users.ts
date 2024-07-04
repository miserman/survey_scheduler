import useStore from '@/app/store'
import {log} from '@/utils/log'

export async function listUsers(study: string) {
  const {studies, studiesStatus} = useStore()
  await studiesStatus.studies_table_scanned
  if (study in studies) {
    const {users} = studies[study]
    log(study, 'listed users of study ' + study)
    return users
  } else {
    log(study, 'failed to list users of study ' + study)
    return {}
  }
}
