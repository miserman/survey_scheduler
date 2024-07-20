import {PublishCommand, SNSClient} from '@aws-sdk/client-sns'

const SNS = new SNSClient({region: process.env.REGION})

export async function sendMessage(params: {Message: string; PhoneNumber: string}) {
  let status = 'unknown'
  try {
    const request = await SNS.send(new PublishCommand(params))
    if (request.$metadata.httpStatusCode === 200) {
      status = 'success'
    } else {
      status = 'HTTP status ' + request.$metadata.httpStatusCode
    }
  } catch (e) {
    status = '' + e
  }
  return status
}
