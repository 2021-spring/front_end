/**
 * Example: node tools/purgeTask -e production-Careful -d "2000-11-15"
 */

let program = require('commander')
let admin = require('firebase-admin')
const readline = require('readline')

async function deleteTask (db, datesStr) {
  // this date is a changeable parameter
  let date = new Date(datesStr)
  let transRef = db.collection('tasks').doc('tasks').collection('active').where('createTime', '<', date)

  console.log('start updating')
  let rtnLog = await batchDeleteTasks(db, transRef)

  console.log('Total qty finally: ', rtnLog)
}

async function deleteOffer (db, datesStr) {
  // this date is a changeable parameter
  let date = new Date(datesStr)
  let transRef = db.collection('offers').doc('offers').collection('active').where('lastEditTime', '<', date)

  console.log('start updating')
  let rtnLog = await batchDeleteOffer(db, transRef)

  console.log('Total qty finally: ', rtnLog)
}

async function batchDeleteOffer (db, ref, batchQuantity = 400) {
  let docs = await ref.limit(batchQuantity).get()
  let count = 0
  let batch
  while (docs.size > 0) {
    batch = db.batch()
    docs.forEach((doc) => {
      batch.delete(doc.ref)
      batch.set(db.collection('offers').doc('offers').collection('archives').doc(), {key: doc.id, ...doc.data()})
    })
    await batch.commit()
    count += docs.size
    console.log('The quantity of docs updated in this iteration: ', docs.size)
    docs = await ref.startAfter(docs.docs.slice(-1)[0]).limit(batchQuantity).get()
  }
  return count
}

async function batchDeleteTasks (db, ref, batchQuantity = 400) {
  let docs = await ref.limit(batchQuantity).get()
  let count = 0
  let batch
  while (docs.size > 0) {
    batch = db.batch()
    docs.forEach((doc) => {
      batch.delete(doc.ref)
      batch.set(db.collection('canceledTasks').doc(), {
        ...doc.data(),
        taskKey: doc.id,
        isPurgeBySys: true
      })
    })
    await batch.commit()
    count += docs.size
    console.log('The quantity of docs updated in this iteration: ', docs.size)
    docs = await ref.startAfter(docs.docs.slice(-1)[0]).limit(batchQuantity).get()
  }
  return count
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-d, --date <date>', `format: 1990-01-08`)
  .option('-t, --target <date>', `purge target: offer/task`, /^(offer|task)$/i, 'task')
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question(`Do you want to purge before ${program.date} ?(retype date) `, (answer) => {
  // TODO: Log the answer in a database
  if (answer === program.date) {
    console.log(`start purging ${program.target}... \n\n\n`)

    if (program.target === 'task') {
      deleteTask(db, program.date)
        .then(() => {
          console.log('purge tasks complete \n\n\n')
        })
    } else if (program.target === 'offer') {
      deleteOffer(db, program.date)
        .then(() => {
          console.log('purge offer complete \n\n\n')
        })
    }
  }
  rl.close()
})
