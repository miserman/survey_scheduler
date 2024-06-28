import {access, appendFile, mkdir} from 'fs'

export const logs = {enabled: true, dir: 'var/log/scheduler'}

const dateFormatter = Intl.DateTimeFormat('en-us', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: 'numeric',
})

const slashes = /\//g
export async function log(study: string, message: string) {
  const date = dateFormatter.format(new Date()).split(', ')
  const file = study + '_' + date[0].replace(slashes, '') + '.txt'
  console.log(file + ' - ' + date[1] + ': ' + message)
  if (logs.enabled) {
    access(logs.dir, async error => {
      if (error) {
        mkdir(logs.dir, {recursive: true}, error => {
          if (error) {
            logs.enabled = false
            console.error('failed to make log directory')
          } else {
            console.log('retrying log after making directory')
            log(study, message)
          }
        })
      } else {
        appendFile(logs.dir + '/' + file, date[1] + ': ' + message + '\n', error => {
          if (error) console.error('log error: ', error)
        })
      }
    })
  }
}
