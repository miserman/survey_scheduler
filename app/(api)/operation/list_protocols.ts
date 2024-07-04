import useStore from '@/app/store'
import {log} from '@/utils/log'

export async function listProtocols(study: string) {
  const {studies, studiesStatus} = useStore()
  await studiesStatus.studies_table_scanned
  if (study in studies) {
    const {protocols} = studies[study]
    log(study, 'listed protocols of study ' + study)
    return protocols
  } else {
    log(study, 'failed to list protocols of study ' + study)
    return {}
  }
}
