import type {MessageId} from '../lib/messages'
import {Sessions} from '../lib/sessions'
import type {Studies} from '../lib/studies'

class Store {
  // client sessions
  sessions = new Sessions()

  // incoming messages
  messageMap: {[index: string]: MessageId} = {}

  // studies
  studies: Studies = {}
  studiesStatusResolvers: {[index: string]: (value: boolean) => void} = {
    studies_table_scanned: (value: boolean) => {},
  }
  studiesStatus: {[index: string]: Promise<boolean>} = {
    studies_table_scanned: new Promise<boolean>(resolve => {
      this.studiesStatusResolvers.studies_table_scanned = resolve
    }),
  }
}

export default function useStore() {
  if (!('survey_scheduler_store' in global)) {
    ;(global as unknown as {survey_scheduler_store: Store}).survey_scheduler_store = new Store()
  }
  return (global as unknown as {survey_scheduler_store: Store}).survey_scheduler_store
}
