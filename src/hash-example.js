const sodium = require('sodium-native')

const message = 'Hello, World!'
const outBuff = Buffer.alloc(sodium.crypto_generichash_BYTES)
const inBuff = Buffer.from(message)

sodium.crypto_generichash(outBuff, inBuff)

console.log(outBuff.toString('hex'))
