let program = require('commander')
let admin = require('firebase-admin')
let xlsx = require('xlsx')

async function getOrganizations (db) {
  let orgDocs = await db.collection('tenants').get()
  let organizations = orgDocs.docs.map(doc => {
    let {name, email, organizationId = ''} = doc.data()
    return {name, email, organizationId}
  })
  return organizations
}

async function tenant2Excel (db) {
  let organizations = await getOrganizations(db)
  let sheet = xlsx.utils.json_to_sheet(organizations)
  let workBook = {
    SheetNames: ['sheet1'],
    Sheets: {}
  }
  workBook.Sheets['sheet1'] = sheet
  xlsx.writeFile(workBook, 'organizations.xlsx')
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
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

tenant2Excel(db)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
