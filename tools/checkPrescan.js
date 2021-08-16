let program = require('commander')
let admin = require('firebase-admin')

async function fixPrescan(warehouseKey, prescanKey, db) {
  console.log({warehouseKey, prescanKey})
  const prescanDoc = await db
    .collection('warehouses')
    .doc(warehouseKey)
    .collection('scannedTrackings')
    .doc(prescanKey)
    .get()
  if (!prescanDoc.exists) {
    console.log('doc not exists.')
    return 'done'
  }
  const {trackings = [], uploadedTrackings = []} = prescanDoc.data()
  const uploadedSet = new Set(uploadedTrackings)

  for (const tracking of trackings) {
    if (!uploadedSet.has(tracking)) {
      const pkgDocs = await db
        .collection('warehouses')
        .doc(warehouseKey)
        .collection('packages')
        .where('trackings', 'array-contains', tracking)
        .get()
      if (pkgDocs.size > 0) {
        console.log('Missing inbound found: ', tracking)
        console.log('Prescan key: ', prescanKey)
        console.log('********************************************')
        uploadedSet.add(tracking)
      }
    }
  }
  if (uploadedSet.size > uploadedTrackings.length) {
    prescanDoc.ref.update({uploadedTrackings: [...uploadedSet]})
  }
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-w, --warehouseKey <warehouseKey>', 'warehouseKey')
  .option('-p, --prescanKey <prescanKey>', 'prescanKey')
  .parse(process.argv)

const { warehouseKey, prescanKey } = program
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
const settings = { timestampsInSnapshots: true }
db.settings(settings)

console.log('Start fixing... \n\n\n')

fixPrescan(warehouseKey, prescanKey, db)
  .then(() => {
    console.log('Fix prescan finished.')
  })
