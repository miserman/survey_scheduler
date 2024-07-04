import {createTable, scanTable} from '@/lib/database'
import type Participant from '@/lib/participant'
import type {Protocols} from '@/lib/protocol'
import {type Studies, Study} from '@/lib/studies'
import type {Users} from '@/lib/user'
import {log} from '@/utils/log'

// retrieve study list with users and protocols
export default async function scanStudies(
  studies: Studies,
  statuses: {[index: string]: Promise<boolean>},
  resolvers: {[index: string]: (value: boolean) => void}
) {
  try {
    const studiesTable = await scanTable('studies')
    if (studiesTable.$metadata.httpStatusCode === 400) {
      try {
        const initRequest = await createTable('studies', 'study')
        if (initRequest.$metadata.httpStatusCode !== 200) {
          log('sessions', 'failed to make creation request: HTTP Code ' + initRequest.$metadata.httpStatusCode)
        } else {
          log('sessions', 'created studies table')
        }
      } catch (e) {
        log('sessions', 'failed to make studies table: ' + e)
      }
    } else if (studiesTable.$metadata.httpStatusCode === 200) {
      if (studiesTable.Items) {
        studiesTable.Items.forEach(item => {
          const {study, protocols, users} = item as {study: string; protocols: Protocols; users: Users}
          if (study in studies) {
            const s = studies[study]
            s.updateProtocols(protocols)
            s.updateUsers(users)
          } else {
            studies[study] = new Study(study, {protocols, users})
          }
          statuses[study] = new Promise(resolve => {
            resolvers[study] = resolve
          })
          retrieveStudy(study, studies, resolvers[study])
        })
        resolvers.studies_table_scanned(true)
        log('sessions', 'scanned studies table')
      } else {
        log('sessions', 'scanned studies table with no items')
      }
    } else {
      log('sessions', 'failed to make scan request: HTTP Code ' + studiesTable.$metadata.httpStatusCode)
    }
  } catch (e) {
    log('sessions', 'failed to can studies table: ' + e)
  }
}

// retrieve participant schedules
async function retrieveStudy(study: string, studies: Studies, resolver: (value: boolean) => void) {
  try {
    const studySchedules = await scanTable(study)
    if (studySchedules.$metadata.httpStatusCode === 200) {
      if (studySchedules.Items) {
        if (study in studies) {
          console.log('adding participants to existing study')
          const s = studies[study]
          s.dbcopy = studySchedules as unknown as {Items: Participant[]}
          s.updateParticipants(s.dbcopy.Items)
        } else {
          console.log('making new study with participants')
          studies[study] = new Study(study, studySchedules as unknown as {Items: Participant[]})
        }
        resolver(true)
        log(study, 'scanned participants table')
      } else {
        log(study, 'scanned participant table with no items')
      }
    } else {
      log(
        study,
        'failed to make retrieve study ' + study + ' request: HTTP Code ' + studySchedules.$metadata.httpStatusCode
      )
    }
  } catch (e) {
    log(study, 'failed to retrieve study ' + study + ': ' + e)
  }
}
