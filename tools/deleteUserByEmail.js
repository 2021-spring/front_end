let program = require('commander')
let admin = require('firebase-admin')

async function deleteUserByEmail (db, email) {
  const userDocs = await db
    .collection('users')
    .where('email', '==', email)
    .get()

  if (userDocs.size === 0) throw Error('user not found.')
  const {organizations = [], warehouses = []} = userDocs.docs[0].data()
  if (organizations.length || warehouses.length) throw Error('user has been assigned a role.')
  const userKey = userDocs.docs[0].id
  await Promise.all([
    userDocs.docs[0].ref.delete(),
    db.collection('userLimitedInfo').doc(userKey).delete()
  ])

  const user = await admin
    .auth()
    .getUserByEmail(email)

  await admin
    .auth()
    .deleteUser(user.uid)
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-k, --email <email>', 'format: 1234@gmail.com')
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

console.log('start deleting... \n\n\n')
deleteUserByEmail(db, program.email)
  .then(() => {
    console.log('deletion complete \n\n\n')
  })
