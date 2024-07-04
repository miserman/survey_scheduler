import useStore from '@/app/store'
import {log} from '@/utils/log'

export async function listStudies(user: string) {
  const {studies, studiesStatus} = useStore()
  await studiesStatus.studies_table_scanned
  const selection: string[] = []
  Object.keys(studies).forEach(study => {
    if (user in studies[study].users) selection.push(study)
  })
  log('sessions', 'listed ' + user + "'s studies")
  return selection
}
