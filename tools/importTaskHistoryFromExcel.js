let program = require('commander')
let admin = require('firebase-admin')
let xlsx = require('xlsx')

async function importTransaction (db, tenantKey, fileName) {
  const transactionRef = db.collection('transaction')
  const workbook = xlsx.readFile(`./${fileName}`)
  let ws = workbook.Sheets[workbook.SheetNames[0]]
  let transactions = xlsx.utils.sheet_to_json(ws, { raw: false })

  console.log('length: ', transactions.length)

  for (let i = 0; i < transactions.length / 100; i++) {
    const batch = db.batch()
    for (let j = i; j < 100; j++) {
      if (transactions[j]) {
        const {Datetime: createTime, Type: transactionType, User: userName, Price: price, Quantity: quantity, UPC: upc, Details: productName, info} = transactions[j]
        const itemDetail = JSON.parse(info)
        Object.assign(itemDetail, {
          createTime: new Date(createTime),
          lastModifiedTime: new Date(itemDetail.lastModifiedTime),
          pendingEndDate: itemDetail.pendingEndDate ? new Date(itemDetail.pendingEndDate) : null,
          tenantKey,
          transactionType,
          userName,
          price,
          quantity,
          upc,
          productName
        })
        batch.set(transactionRef.doc(), itemDetail)
      }
    }
    await batch.commit()
  }
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-k, --key <key>', `tenantKey string`)
  .option('-f, --fileName <fileName>', `fileName, include suffix`)
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

importTransaction(db, program.key, program.fileName)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
