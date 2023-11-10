const http = require('https'),
  zlib = require('zlib')
exports.handler = async function (event) {
  return new Promise(function (resolve, reject) {
    if (event.awslogs && event.awslogs.data) {
      const p = /^{/
      zlib.gunzip(Buffer.from(event.awslogs.data, 'base64'), function (e, b) {
        if (e) {
          reject(Error(e))
        } else {
          const d = JSON.parse(b.toString('ascii')).logEvents
          for (let i = d.length; i--; )
            if (p.test(d[i].message)) {
              const s = JSON.parse(d[i].message)
              if (s.notification && s.notification.messageId) {
                const body = JSON.stringify({
                  messageId: s.notification.messageId,
                  timestamp: d[i].timestamp || s.notification.timestamp,
                  providerResponse: s.delivery && s.delivery.providerResponse ? s.delivery.providerResponse : '',
                  status: s.status,
                })
                const req = http.request(
                  {
                    method: 'POST',
                    hostname: 'example.com',
                    path: '/status',
                    headers: {
                      'Content-Type': 'application/json',
                      'Content-Length': Buffer.byteLength(body),
                    },
                  },
                  function () {
                    console.log('sent status for message', s.notification.messageId)
                  }
                )
                req.on('error', function (e) {
                  reject(Error(e))
                })
                req.write(body)
                req.end()
              }
            }
        }
      })
    } else reject(Error('event is not in the expected format'))
  })
}
