/*
export tenant task history
usage: (pick one of it buy not combine)
1. with keywords
  node tools/exportTaskHistory.js -e production-Careful -k eaylS8HMe42KPzXe1DgQ -w ipad,iphone

  or 

2. with time range
  node tools/exportTaskHistory.js -e production-Careful -k eaylS8HMe42KPzXe1DgQ -d 2021-06-15,2021-06-16
*/

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

async function getTransactions (db, tenantKey, keywords, dates) {
  let transactionRef = db
    .collection('transaction')
    .where('tenantKey', '==', tenantKey)
    .where('transactionType', '==', 'inbound')
  
  if (keywords) {
    transactionRef = transactionRef.where('searchKeywords', 'array-contains-any', keywords)
  }

  if (dates) {
    const [startDateStr, endDateStr] = dates.split(',')
    const startDate = new Date(startDateStr)
    const endDate = new Date(new Date(endDateStr).getTime() + 86400000)

    transactionRef = transactionRef.where('createTime', '>=', startDate)
      .where('createTime', '<', endDate)
  }
  
  transactionRef = transactionRef.orderBy('createTime', 'desc')
  let transactionDocs = await transactionRef.get()
  let transactions = transactionDocs.docs.map(doc => {
    let aTransaction = convertTimestampToDateInObj(doc.data())

    let {createTime, transactionType, userName, price, quantity, upc, productName, trackingConfirmed, warehouse, bonus} = convertTimestampToDateInObj(doc.data())
    price = aTransaction.warehouse === 'self' ? (price + bonus || 0) : price
    return {Datetime: createTime, Type: transactionType, User: userName, Price: price, Quantity: quantity, Amount: price * quantity, UPC: upc, Details: productName, Trackings: warehouse === 'warehouse' ? trackingConfirmed.join(', ') : '', info: JSON.stringify(aTransaction)}
  })
  transactions.sort((a, b) => a.Datetime < b.Datetime ? 1 : -1)
  return transactions
}

async function transactions2Excel (db, tenantKey, keywords, dates) {
  keywords && (keywords = keywords.split(','))
  let transactions = await getTransactions(db, tenantKey, keywords, dates)
  let sheet = xlsx.utils.json_to_sheet(transactions)
  let workBook = {
    SheetNames: ['sheet1'],
    Sheets: {}
  }
  workBook.Sheets['sheet1'] = sheet
  xlsx.writeFile(workBook, `${tenantKey}_${keywords ? keywords.join('_') : ''}_${dates || ''}.xlsx`)
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-w, --keywords <keywords>', `format: keyword1,keyword2`)
  .option('-k, --key <key>', `tenantKey string`)
  .option('-d, --date <date>', `format: 1990-01-08,2000-03-01`)
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

transactions2Excel(db, program.key, program.keywords, program.date)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
