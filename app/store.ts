import type {MessageId} from '../lib/messages'
import {Sessions} from '../lib/sessions'
import {SNSClient} from '@aws-sdk/client-sns'
import {scanStudies, type Studies} from '../lib/studies'

// sessions
export const sessions = new Sessions()

// messages
export const messageMap: {[index: string]: MessageId} = {}
export const SNS = new SNSClient({region: process.env.REGION})

// studies
export const studies: Studies = {}
export const studiesStatusResolvers: {[index: string]: (value: boolean) => void} = {
  studies_table_scanned: (value: boolean) => {},
}
export const studiesStatus: {[index: string]: Promise<boolean>} = {
  studies_table_scanned: new Promise<boolean>(resolve => {
    studiesStatusResolvers.studies_table_scanned = resolve
  }),
}
scanStudies(studies, studiesStatus, studiesStatusResolvers)
