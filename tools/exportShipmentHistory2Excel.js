let program = require('commander')
let admin = require('firebase-admin')
let xlsx = require('xlsx')

function toTimestampString (date) {
  return date && date.toUTCString()
}

function convertTimestampToDateInObj (obj) {
  for (var a in obj) {
    if (typeof (obj[a]) === 'object' && obj[a] !== null && !Number.isNaN(obj[a])) {
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

async function getShipments (db, date, tenantKey) {
  let {startDate, endDate} = dateParser(date)
  let shipmentRef = db.collection('archivedShipments').where('tenantKey', '==', tenantKey).where('createTime', '>=', startDate).where('createTime', '<=', endDate).orderBy('createTime', 'desc')
  let shipmentDocs = await shipmentRef.get()
  let shipments = shipmentDocs.docs.reduce((acc, doc) => {
    let aShipment = convertTimestampToDateInObj(doc.data())
    let shipmentArray = aShipment.products.map(product => {
      let {name, upc, toShip, userName, siteName} = product
      return {Datetime: aShipment.createTime, name: name, upc: upc, quantity: toShip, location: `${userName} ${siteName}`}
    })
    return [...acc, ...shipmentArray]
  }, [])
  return shipments
}

async function shipments2Excel (db, date, tenantKey) {
  let transactions = await getShipments(db, date, tenantKey)
  let sheet = xlsx.utils.json_to_sheet(transactions)
  let workBook = {
    SheetNames: ['sheet1'],
    Sheets: {}
  }
  workBook.Sheets['sheet1'] = sheet
  xlsx.writeFile(workBook, 'shipmentOutput.xlsx')
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

shipments2Excel(db, program.date, program.key)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })

