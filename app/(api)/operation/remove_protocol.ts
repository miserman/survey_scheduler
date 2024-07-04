import {removeStudyProtocol} from '@/lib/database'
import useStore from '@/app/store'
import {log} from '@/utils/log'

export async function removeProtocol(study: string, name: string) {
  const {studies} = useStore()
  let status = 'failed to remove protocol ' + name + ' from study ' + study + ': unknown'
  try {
    const createRequest = await removeStudyProtocol(study, name)
    if (createRequest.$metadata.httpStatusCode === 200) {
      delete studies[study].protocols[name]
      status = 'success'
    } else {
      status = 'failed to make remove protocol request: HTTP status ' + createRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to remove protocol ' + name + ' from study ' + study + ': ' + e
  }
  log(study, status === 'success' ? 'removed protocol ' + name + ' from study ' + study : status)
  return status
}
