export class MessageReceipt {
  messageId = ''
  timestamp = ''
  providerResponse = ''
  status: 'SUCCESS' | 'FAILURE' = 'FAILURE'
  constructor(receipt?: Partial<MessageReceipt>) {
    const o = Object(receipt) as Partial<MessageReceipt>
    ;(['messageId', 'timestamp', 'providerResponse', 'status'] as (keyof MessageReceipt)[]).forEach(k => {
      if (k in o) {
        if (k === 'status') {
          this[k] = 'FAILURE' === o[k] ? 'FAILURE' : 'SUCCESS'
        } else {
          this[k] = '' + o[k]
        }
      }
    })
  }
}
export class MessageReceipts {
  initial?: MessageReceipt
  reminder?: MessageReceipt
  constructor(receipts?: Partial<MessageReceipts>) {
    const o = Object(receipts)
    if ('initial' in o) this.initial = new MessageReceipt(o.initial)
    if ('reminder' in o) this.reminder = new MessageReceipt(o.reminder)
  }
}
