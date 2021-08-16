let program = require('commander')
let admin = require('firebase-admin')
let xlsx = require('xlsx')

function toTimestampString (date) {
  return date && date.toISOString()
}

function convertTimestampToDateInObj (obj) {
  for (var a in obj) {
    if (typeof (obj[a]) === 'object' && obj[a] !== null) {
      if (typeof obj[a].toDate === 'function') {
        obj[a] = toTimestampString(obj[a].toDate())
      } else {
        convertTimestampToDateInObj(obj[a])
      }
    }
  }
  return obj
}

function dateParser (date) {
  let startDate = new Date(date.split(',')[0])
  let endDate = new Date(date.split(',')[1])
  return {startDate, endDate}
}

async function getTransactions (db, date, tenantKey) {
  let {startDate, endDate} = dateParser(date)
  let transactionRef = db.collection('transaction').where('tenantKey', '==', tenantKey).where('createTime', '>=', startDate).where('createTime', '<=', endDate).orderBy('createTime', 'desc')
  let transactionDocs = await transactionRef.get()
  let transactions = transactionDocs.docs.map(doc => {
    let aTransaction = convertTimestampToDateInObj(doc.data())
    if (aTransaction.transactionType === 'inbound') {
      let {createTime, transactionType, userName, price, quantity, upc, productName, trackingConfirmed, warehouse, bonus} = convertTimestampToDateInObj(doc.data())
      price = aTransaction.warehouse === 'self' ? (price + bonus || 0) : price
      return {Datetime: createTime, Type: transactionType, User: userName, Price: price, Quantity: quantity, Amount: price * quantity, UPC: upc, Details: productName, Trackings: warehouse === 'warehouse' ? trackingConfirmed.join(', ') : ''}
    } else if (aTransaction.isPayment) {
      let {createTime, transactionType, userName, amount, method} = convertTimestampToDateInObj(doc.data())
      delete method.displayName
      delete method.filter
      delete method.isValid
      delete method.index
      let category = method.category
      delete method.category
      method.billingAddress && (method.billingAddress = method.billingAddress + '(billing address)')
      let details = category + '-' + Object.values(method).join('-')
      return {Datetime: createTime, Type: transactionType, User: userName, Amount: -amount, Details: details}
    } else {
      let {createTime, userName, amount, note} = convertTimestampToDateInObj(doc.data())
      return {Datetime: createTime, Type: 'Adjust Balance', User: userName, Amount: amount, Details: note}
    }
  })
  return transactions
}

async function transactions2Excel (db, date, tenantKey) {
  let transactions = await getTransactions(db, date, tenantKey)
  let sheet = xlsx.utils.json_to_sheet(transactions)
  let workBook = {
    SheetNames: ['sheet1'],
    Sheets: {}
  }
  workBook.Sheets['sheet1'] = sheet
  xlsx.writeFile(workBook, 'auditOutput.xlsx')
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-d, --date <date>', `format: 1990/01/08,2000/03/01`)
  .option('-k, --key <key>', `tenantKey string`)
  .parse(process.argv)

process.env.NODE_ENV = program.env
let certPath

if (program.env === 'production-Careful') {
  certPath = '../config/cert/prod-cert.json'
} else if (program.env === 'core') {
  certPath = '../config/cert/core-cert.json'
} else {
  certPath = '../config/cert/dev-cert.json'
}

console.log(`==================================================`)
console.log(`==========run on ${program.env}=========`)
console.log(`==================================================`)

let serviceAccount = require(certPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://' + serviceAccount.project_id + '.firebaseio.com'
})

let db = admin.firestore()
const settings = {timestampsInSnapshots: true}
db.settings(settings)

console.log('start transforming... \n\n\n')

transactions2Excel(db, program.date, program.key)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
