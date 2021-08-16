let program = require('commander')
let admin = require('firebase-admin')

function addBaseQuery (query, pathString) {
  let path = pathString.split('/')
  return path.reduce((previousValue, currentValue, currentIndex) => {
    return currentIndex % 2 === 0 ? previousValue.collection(currentValue) : previousValue.doc(currentValue)
  }, query)
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-p, --path <path>', `path seperated by '/'`)
  .option('-n, --newKey <newKey>', `the new tracking number that will be used to confirm`)
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
let {path, newKey} = program

if (!path || !newKey) throw Error('Argument missing')

console.log('start update... \n\n\n')
addBaseQuery(db, path).get()
  .then(doc => {
    if (doc.exists) {
      let oldTrackings = doc.data().trackings
      let keys = Object.keys(oldTrackings)
      if (keys.length > 1) throw Error('there are more than one tracking')
      let trackings = [oldTrackings[keys[0]]]

      console.log('updated one document')
      return doc.ref.update({trackings})
    }
  })
  .then(() => {
    console.log('\nAction finished!')
  })
