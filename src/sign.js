var sodium = require('sodium-native')

var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
var secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
sodium.crypto_sign_keypair(publicKey, secretKey)

var message = Buffer.from('Hello world!', 'utf8')
var signature = Buffer.alloc(sodium.crypto_sign_BYTES)

sodium.crypto_sign_detached(signature, message, secretKey)

const result = `${message.toString('hex').replace(/\s/g, '\\s')}---${publicKey.toString('hex')}---${signature.toString('hex')}`
process.stdout.write(result)

// const validSig = sodium.crypto_sign_verify_detached(signature, message, publicKey)
// console.log(validSig)
// console.assert(validSig, 'Invalid signature!')
