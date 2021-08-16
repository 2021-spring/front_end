let program = require('commander')
let admin = require('firebase-admin')
let xlsx = require('xlsx')

async function getWarehouseFeeArray (db, warehouseKey = '', tenantKey = '', startDate = new Date(), endDate = new Date()) {
  let logDocs = await db
    .collection('warehouseTransactions')
    .where('warehouseKey', '==', warehouseKey)
    .where('tenantKey', '==', tenantKey)
    .where('transactionType', '==', 'fee')
    .where('createTime', '>=', startDate)
    .where('createTime', '<=', endDate)
    .orderBy('createTime', 'desc')
    .get()

  return logDocs.docs.map(doc => {
    let {subtype, createTime, discountRate, amount} = doc.data()
    return {subtype, createTime: createTime.toDate().toISOString(), discountRate, amount}
  })
}

async function warehouseFee2Excel (db, warehouseKey, tenantKey, startDate, endDate) {
  let warehouseFeeArray = await getWarehouseFeeArray(db, warehouseKey, tenantKey, startDate, endDate)
  let sheet = xlsx.utils.json_to_sheet(warehouseFeeArray)
  let workBook = {
    SheetNames: ['sheet1'],
    Sheets: {}
  }
  workBook.Sheets['sheet1'] = sheet
  xlsx.writeFile(workBook, 'warehouse_fee.xlsx')
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-k, --key <key>', 'format: warehouseKey,tenantKey')
  .option('-d, --date <date>', `format: 1990/01/08,2000/03/01`)
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
const [startDate, endDate] = program.date.split(',')
const [warehouseKey, tenantKey] = program.key.split(',')
warehouseFee2Excel(db, warehouseKey, tenantKey, new Date(startDate), new Date(endDate))
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
