import {SNSClient} from '@aws-sdk/client-sns'

export type MessageId = [
  string, // study
  string, // id
  number, // day
  number, // beep
  number // status
]

export const messageMap: {[index: string]: MessageId} = {}

export const SNS = new SNSClient({region: process.env.REGION})
