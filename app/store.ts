import type {MessageId} from '../lib/messages'
import {Sessions} from '../lib/sessions'
import {SNSClient} from '@aws-sdk/client-sns'
import type {Studies} from '../lib/studies'

class Store {
  // sessions
  sessions = new Sessions()

  // messages
  messageMap: {[index: string]: MessageId} = {}
  SNS = new SNSClient({region: process.env.REGION})

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
