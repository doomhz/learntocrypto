const sodium = require('sodium-native')

const signedResult = process.argv[2].split('---')
// console.log(signedResult)

const message = Buffer.from(signedResult[0], 'hex')
const publicKey = Buffer.from(signedResult[1], 'hex')
const signature = Buffer.from(signedResult[2], 'hex')

const validSig = sodium.crypto_sign_verify_detached(signature, message, publicKey)
console.assert(validSig, 'Invalid signature!')
console.log(`Message was successfully validated: ${message.toString()}`)
