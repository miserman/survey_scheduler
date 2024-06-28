import {log, logs} from '@/utils/log'
import {readFile} from 'fs'

export function readLog(name: string) {
  return new Promise<string>(resolve => {
    readFile(logs.dir + '/' + name, 'utf-8', (error, content) => {
      if (error) {
        console.error('failed to read file: ' + name)
      } else {
        log(name.split('_')[0], 'viewed log ' + name)
      }
      resolve(content || '')
    })
  })
}
