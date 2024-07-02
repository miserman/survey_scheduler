import {log} from '@/utils/log'
import {createTable, scanTable} from '@/lib/database'
import Participant from '@/lib/participant'
import {Protocol, type Protocols} from '@/lib/protocol'
import type {User, Users} from '@/lib/user'

export type StudyMetadata = {
  study: string
  protocols: {[index: string]: Partial<Protocol>}
  users: {[index: string]: Partial<User>}
}
export class Study {
  name: string
  dbcopy: {Items: Participant[]} = {Items: []}
  participants: {[index: string]: Participant} = {}
  protocols: Protocols = {
    signal: new Protocol({
      color: '#ffcccc',
      beeps: 6,
      offset: 0,
      random_start: true,
      randomization: 'binned',
      minsep: 30,
      reminder_after: 10,
      close_after: 30,
      accesses: 1,
      initial_message: 'Please complete this survey within 30 minutes:',
      reminder_message: 'Reminder: complete your survey within 20 minutes.',
      reminder_link: true,
      link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
      id_parameter: 'id',
    }),
    event: new Protocol({
      color: '#83f0ff',
      beeps: 1,
      offset: 15,
      initial_message: 'Please complete this survey after any study-relevant event:',
      link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
      id_parameter: 'id',
    }),
  }
  users: Users = {}
  constructor(name: string, existing?: {Items: Participant[]} | {protocols: Protocols; users: Users}) {
    this.name = name
    if (existing) {
      if ('Items' in existing) {
        this.dbcopy = {Items: existing.Items}
        existing.Items.forEach(p => (this.participants[p.id] = p))
      } else {
        this.protocols = existing.protocols
        this.users = existing.users
      }
    }
  }
  updateProtocols(protocols: Protocols) {
    this.protocols = protocols
  }
  updateUsers(users: Users) {
    this.users = users
  }
  updateParticipants(participants: Participant[]) {
    this.participants = {}
    participants.forEach(p => (this.participants[p.id] = new Participant(p)))
  }
  establishSchedules() {
    Object.keys(this.participants).forEach(name => {
      const participant = this.participants[name]
      participant.establish()
    })
  }
  export() {
    const res = {study: this.name, protocols: {}, users: {}} as StudyMetadata
    Object.keys(this.protocols).forEach(name => (res.protocols[name] = this.protocols[name].export()))
    Object.keys(this.users).forEach(name => (res.users[name] = this.users[name].export()))
    return res
  }
}

export type Studies = {[index: string]: Study}

// retrieve study list with users and protocols
export async function scanStudies(
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
            console.log('adding protocols and users to existing study')
            const s = studies[study]
            s.updateProtocols(protocols)
            s.updateUsers(users)
          } else {
            console.log('making new study from protocols and users')
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
