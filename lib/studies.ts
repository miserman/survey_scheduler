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
