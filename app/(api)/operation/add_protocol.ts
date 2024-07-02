import {updateStudyProtocol} from '@/lib/database'
import {Protocol} from '@/lib/protocol'
import {studies} from '@/app/store'
import {log} from '@/utils/log'

export async function addProtocol(study: string, name: string, params: Protocol) {
  let status = 'failed to add protocol ' + name + ' to study ' + study + ': unknown'
  const protocol = new Protocol(params)
  try {
    const createRequest = await updateStudyProtocol(study, name, protocol.export())
    if (createRequest.$metadata.httpStatusCode === 200) {
      studies[study].protocols[name] = protocol
      status = 'success'
    } else {
      status = 'failed to make add protocol request: HTTP status ' + createRequest.$metadata.httpStatusCode
    }
  } catch (e) {
    status = 'failed to add protocol ' + name + ' to study ' + study + ': ' + e
  }
  log(study, status === 'success' ? 'added protocol ' + name + ' to study ' + study : status)
  return status
}
