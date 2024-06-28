import {log} from '@/utils/log'
import {NextRequest} from 'next/server'
import {messageMap} from '@/app/store/messages'
import {studies} from '@/app/store/studies'

function email_notification(Subject: string, Message: string) {
  // if (process.env.NOTIFICATIONS)
  //   message.publish(
  //     {
  //       Message,
  //       Subject,
  //       TopicArn: process.env.NOTIFICATIONS,
  //     },
  //     function (e) {
  //       if (e) console.log('notification was not sent: ' + Message)
  //     }
  //   )
}

// receive message status updates from SNS and Lambda
export async function POST(request: NextRequest) {
  const body = {messageId: '', providerResponse: '', timestamp: '', status: ''}
  if (request.body) {
    if (body.messageId && body.messageId in messageMap) {
      const cords = messageMap[body.messageId]
      const messageType = cords[4] === 2 ? 'initial' : 'reminder'
      const schedule = studies[cords[0]].participants[cords[1]].schedule[cords[2]]
      if (schedule.messages && schedule.messages.length > cords[3]) {
        // body.providerResponse = '' + request.body.providerResponse
        // body.timestamp = request.body.timestamp
        // body.status = request.body.status
        // update_status(cords[0], cords[1], cords[2], cords[3], cords[4], false, 0, body)
        if (body.status === 'FAILURE')
          email_notification(
            'Failed Delivery in Study ' + cords[0],
            'Beep ' +
              cords[2] +
              '[' +
              cords[3] +
              '] for participant ' +
              cords[1] +
              ' in study ' +
              cords[0] +
              ' failed to be delivered:\n\n  Time: ' +
              body.timestamp +
              '\n\n  Reason: ' +
              body.providerResponse
          )
      } else
        log(
          cords[0],
          'received failed status for message ' +
            body.messageId +
            ', but could not find it in ' +
            cords[1] +
            '[' +
            cords[2] +
            ']'
        )
    }
  }
  return Response.json(body)
}
