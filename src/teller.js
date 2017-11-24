// teller.js
const jsonStream = require('duplex-json-stream')
const net = require('net')

const client = jsonStream(net.connect(3876))

const COMMAND = process.argv[2]
const PARAMS = parseParams(process.argv[3])

client.on('data', function (msg) {
  console.log('Teller received:', msg)
})

// client.end can be used to send a request and close the socket
client.end(Object.assign({cmd: COMMAND}, PARAMS))

function parseParams(params) {
  const paramsObj = {}

  if (!params) {
    return {}
  }

  const paramPairs = params.split(',')

  paramPairs.forEach(function (pair) {
    const parsedParams = pair.split('=')
    paramsObj[parsedParams[0]] = parsedParams[1]
  })

  return paramsObj
}
