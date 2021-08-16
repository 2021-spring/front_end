let program = require('commander')
let admin = require('firebase-admin')

async function checkOffers (db, flag) {
  let offerRef = db.collection('offers').doc('offers')
  let activeDocs = await offerRef.collection('active').get()
  let archiveDocs = await offerRef.collection('archives').get()
  let proposeDocs = await offerRef.collection('proposes').get()

  activeDocs.forEach(doc => {
    let {quantity} = doc.data()
    if (typeof quantity !== 'number') {
      console.log(`Warning: offers/offers/active/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
      if (flag) {
        doc.ref.update({quantity: parseInt(quantity)})
      }}
  })

  archiveDocs.forEach(doc => {
    let {quantity} = doc.data()
    if (typeof quantity !== 'number') {
      console.log(`Warning: offers/offers/archives/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
      if (flag) {
        doc.ref.update({quantity: parseInt(quantity)})
      }}
  })

  proposeDocs.forEach(doc => {
    let {quantity} = doc.data()
    if (typeof quantity !== 'number') {
      console.log(`Warning: offers/offers/proposes/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
      if (flag) {
        doc.ref.update({quantity: parseInt(quantity)})
      }}
  })
  return 'offer finished'
}

async function checkTasks (db, flag) {
  let taskRef = db.collection('tasks').doc('tasks').collection('active')
  let taskDocs = await taskRef.get()

  taskDocs.forEach(doc => {
    let {quantity} = doc.data()
    if (typeof quantity !== 'number') {
      console.log(`Warning: tasks/tasks/active/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
      if (flag) {
        doc.ref.update({quantity: parseInt(quantity)})
      }}
  })
  return 'task finished'
}

async function checkWarehousePackage (db, flag) {
  let warehouseRef = db.collection('warehouses')
  let warehouseDocs = await warehouseRef.get()

  warehouseDocs.forEach(async warehouseDoc => {
    let {users} = warehouseDoc.data()
    if (users) {
      let pkgRef = warehouseRef.doc(warehouseDoc.id).collection('packages')
      let pkgDocs = await pkgRef.get()
      pkgDocs.forEach(doc => {
        let {quantity} = doc.data()
        if (typeof quantity !== 'number') {
          console.log(`Warning: warehouses/${warehouseDoc.id}/packages/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
          if (flag) {
            doc.ref.update({quantity: parseInt(quantity)})
          }}
      })
    }
  })
  return 'package finished'
}

async function checkTenantInventory (db, flag) {
  let tenantRef = db.collection('tenants')
  let tenantDocs = await tenantRef.get()

  tenantDocs.forEach(async tenantDoc => {
    let {productIndex} = tenantDoc.data()
    if (productIndex) {
      let inventoryRef = tenantRef.doc(tenantDoc.id).collection('inventory')
      let inventoryDocs = await inventoryRef.get()
      inventoryDocs.forEach(doc => {
        let {quantity} = doc.data()
        if (typeof quantity !== 'number') {
          console.log(`Warning: tenants/${tenantDoc.id}/inventory/${doc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
          if (flag) {
            doc.ref.update({quantity: parseInt(quantity)})
          }}
      })
    }
  })
  return 'inventory finished'
}

async function checkTransaction (db, flag) {
  let transactionRef = db.collection('transaction').where('transactionType', '==', 'inbound')
  let transactionDocs = await transactionRef.get()

  transactionDocs.forEach(async transactionDoc => {
    let {quantity} = transactionDoc.data()
    if (typeof quantity !== 'number') {
      console.log(`Warning: transaction/${transactionDoc.id} --- quanitity: ${quantity} --- type: ${typeof quantity}`)
      if (flag) {
        transactionDoc.ref.update({quantity: parseInt(quantity)})
      }
    }
  })
  return 'inventory finished'
}

async function startCheck (db, flag) {
  await checkTenantInventory(db, flag)
  await checkWarehousePackage(db, flag)
  await checkTasks(db, flag)
  await checkOffers(db, flag)
  await checkTransaction (db, flag)
  return 'check finished'
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-t, --transform <transform>', 'is transform')
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

console.log('start checking... \n\n\n')

startCheck(db, program.transform)

