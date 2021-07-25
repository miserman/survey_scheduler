const http = require('https'),
  zlib = require('zlib')
exports.handler = async function (event) {
  return new Promise(function (resolve, reject) {
    if (event.awslogs && event.awslogs.data) {
      var data = Buffer.from(event.awslogs.data, 'base64'),
        p = /^{/,
        i,
        s = {},
        body,
        req
      zlib.gunzip(data, function (e, d) {
        if (e) {
          reject(Error(e))
        } else {
          for (d = JSON.parse(d.toString('ascii')).logEvents, i = d.length; i--; )
            if (p.test(d[i].message)) {
              s = JSON.parse(d[i].message)
              if (s.notification && s.notification.messageId) {
                body = JSON.stringify({
                  messageId: s.notification.messageId,
                  timestamp: d[i].timestamp || s.notification.timestamp,
                  providerResponse: s.delivery && s.delivery.providerResponse ? s.delivery.providerResponse : '',
                  status: s.status,
                })
                req = http.request(
                  {
                    method: 'POST',
                    hostname: 'example.com',
                    path: '/status',
                    headers: {
                      'Content-Type': 'application/json',
                      'Content-Length': Buffer.byteLength(body),
                    },
                  },
                  function (res) {
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
