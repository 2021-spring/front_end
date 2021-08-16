let program = require('commander')
let admin = require('firebase-admin')

async function reverseUpdatingFlag (db, ver, txt) {
  let ref = db.collection('sysAdmin').doc('general')
  return db.runTransaction(async trans => {
    let data = await trans.get(ref)
    let isSysUpdating = !data.data().isSysUpdating
    let version = ver || data.data().version
    let updatingText = txt || data.data().updatingText
    trans.update(ref, {isSysUpdating, version, updatingText})
  })
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-t, --text <text>', `format: updating system plz wait`)
  .option('-v, --version <version>', `format: 1.5.9`)
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

console.log('start updating... \n\n\n')

if (typeof program.version !== 'string') {
  program.version = null
}

if (typeof program.text !== 'string') {
  program.text = null
}

reverseUpdatingFlag(db, program.version, program.text)
  .then(() => {
    console.log('update complete \n\n\n')
  })
