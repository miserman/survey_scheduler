import {log, logs} from '@/utils/log'
import {readdir} from 'fs'

export function listLogs(prefix: string) {
  return new Promise<string[]>(resolve => {
    readdir(logs.dir, (error, files) => {
      const res: string[] = []
      if (error) {
        console.error('failed to list log files')
      } else if (files) {
        try {
          const pattern = new RegExp('^' + prefix + '_')
          files.forEach(file => {
            if (pattern.test(file)) res.push(file)
          })
          log(prefix, 'listed logs')
        } catch {
          console.error('failed to filter listed log files')
        }
      }
      resolve(res)
    })
  })
}
