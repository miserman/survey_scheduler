import {studies, studiesStatus} from '@/app/store/studies'
import {log} from '@/utils/log'

export async function listProtocols(study: string) {
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
