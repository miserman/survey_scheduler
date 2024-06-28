import type {Operations} from '@/utils/operation'

export function operation(body: Operations) {
  return new Promise(resolve => {
    switch (body.type) {
      case 'list_logs':
        resolve([])
        break
      case 'view_log':
        resolve('')
        break
      case 'list_studies':
        resolve([])
        break
    }
  })
}
