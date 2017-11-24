const path = require('path')
const fs = require('fs')
const jsonStream = require('duplex-json-stream')
const net = require('net')
const sodium = require('sodium-native')

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data/db.json')
const PUBLIC_KEY_PATH = path.join(ROOT, 'keys/public.key')
const SECRET_KEY_PATH = path.join(ROOT, 'keys/secret.key')

const [publicKey, secretKey] = loadKeys()
const db = loadTransactionsDb()

const server = net.createServer(function (socket) {
  socket = jsonStream(socket)

  socket.on('data', function (msg) {
    console.log('Bank received:', msg)
    // socket.write can be used to send a reply
    const response = {cmd: 'balance'}
    switch (msg.cmd) {
      case 'balance':
        response.balance = calculateTotalBalance()
        break
      case 'deposit':
        addTransaction({cmd: msg.cmd, amount: parseFloat(msg.amount)})
        response.balance = calculateTotalBalance()
        break
      case 'withdraw':
        const currentBalance = calculateTotalBalance()
        if (parseFloat(msg.amount) > currentBalance) {
          response.error = 'Not enough funds!'
        } else {
          addTransaction({cmd: msg.cmd, amount: -parseFloat(msg.amount)})
        }
        response.balance = calculateTotalBalance()
        break
      default:
        response.error = 'Unknown command!'
        break
    }
    socket.write(response)
  })
})

server.listen(3876)



function calculateTotalBalance() {
  let total = 0
  db.forEach(function (t) {
    total += t.value.amount
  })
  return total
}

function loadTransactionsDb() {
  const transactions = JSON.parse(fs.readFileSync(DB_PATH).toString('utf-8'))
  validateLedger(transactions)

  return transactions
}

function saveTransactionsDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

function addTransaction(trData) {
  const transaction = {
    value: trData,
  }
  let prevHash
  if (!db.length) {
    // One edge-case with referring to the previous hash is that you need a
    // "genesis" hash for the first entry in the log
    prevHash = Buffer.alloc(32).toString('hex')
  } else {
    prevHash = db[db.length - 1].hash
  }
  transaction.hash = hashToHex(prevHash + JSON.stringify(transaction.value))

  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, Buffer.from(transaction.hash, 'utf8'), secretKey)
  transaction.signature = signature.toString('hex')

  db.push(transaction)
  saveTransactionsDb()
}

function hashToHex(data) {
  const outBuff = Buffer.alloc(sodium.crypto_generichash_BYTES)
  const inBuff = Buffer.from(data)
  sodium.crypto_generichash(outBuff, inBuff)

  return outBuff.toString('hex')
}

function validateLedger(transactions) {
  for (let index = 1; index < transactions.length; index++) {

    // Validate transaction value hash equals db hash
    const resultHash = hashToHex(transactions[index - 1].hash + JSON.stringify(transactions[index].value))
    if (resultHash !== transactions[index].hash) {
      throw Error(`Corrupt database! Transaction hash not valid for transaction ${index}.`)
    }

    // Validate that hash signature was signed with the right data key
    const message = Buffer.from(transactions[index].hash, 'utf8')
    const signature = Buffer.from(transactions[index].signature, 'hex')
    const validSig = sodium.crypto_sign_verify_detached(signature, message, publicKey)
    if (!validSig) {
      throw Error(`Corrupt database! Signature not valid for transaction ${index}.`)
    }
  }
}

function loadKeys() {
  let publicKey
  let secretKey
  let syncKeys

  try {
    publicKey = Buffer.from(fs.readFileSync(PUBLIC_KEY_PATH).toString('utf-8'), 'hex')
  } catch (e) {
    publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    syncKeys = true
  }
  try {
    secretKey = Buffer.from(fs.readFileSync(SECRET_KEY_PATH).toString('utf-8'), 'hex')
  } catch (e) {
    secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    syncKeys = true
  }

  if (syncKeys) {
    sodium.crypto_sign_keypair(publicKey, secretKey)
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey.toString('hex'))
    fs.writeFileSync(SECRET_KEY_PATH, secretKey.toString('hex'))
  }

  return [publicKey, secretKey]
}
