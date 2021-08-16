let program = require('commander')
let admin = require('firebase-admin')

function addBaseQuery (query, pathString) {
  let path = pathString.split('/')
  return path.reduce((previousValue, currentValue, currentIndex) => {
    return currentIndex % 2 === 0 ? previousValue.collection(currentValue) : previousValue.doc(currentValue)
  }, query)
}

function addPredicates (query, where) {
  let predicates = where.split('~')
  return predicates.reduce((previousValue, currentValue) => {
    let items = currentValue.split(',')
    if (items.length < 3) throw Error('predicate format invalid')
    if (items[1] === 'oneDay') {
      return addOneDayPredicate(previousValue, items[0], items[2])
    } else {
      let value = convertValue(items[2])
      if (value === null) throw Error('invalid predicate value')
      return previousValue.where(items[0], items[1], value)
    }
  }, query)
}

function addOneDayPredicate (query, field, dayString) {
  if (dayString.charAt(0) === 'D') dayString = dayString.slice(1)
  let startTime = new Date(dayString.concat('T00:00:00Z'))
  let endTime = new Date(dayString.concat('T23:59:59Z'))
  console.log(`\nQuerry ${field} between ${startTime.toISOString()} and ${endTime.toISOString()}`)
  return query.where(field, '>=', startTime).where(field, '<=', endTime)
}

function convertValue (text) {
  let type = text.charAt(0)
  let rawValue = text.slice(1)
  let returnValue
  switch (type) {
    case 'S':
      returnValue = rawValue
      break
    case 'N':
      returnValue = parseFloat(rawValue)
      break
    case 'B':
      returnValue = rawValue === 'true' ? true : (rawValue === 'false' ? false : null)
      break
    case 'D':
      returnValue = new Date(rawValue)
      break
  }

  console.log('predicate value: ', returnValue)
  return returnValue
}

function addOrderBy (query, orderBy) {
  return query.orderBy(orderBy)
}

function addLimitClause (query, limit) {
  return query.limit(parseInt(limit))
}

function convertDate (data) {
  let aDoc = {...data}
  aDoc.createTime && typeof aDoc.createTime.toDate === 'function' && (aDoc.createTime = aDoc.createTime.toDate())
  aDoc.pendingEndDate && typeof aDoc.pendingEndDate.toDate === 'function' && (aDoc.pendingEndDate = aDoc.pendingEndDate.toDate())
  aDoc.lastModifiedTime && typeof aDoc.lastModifiedTime.toDate === 'function' && (aDoc.lastModifiedTime = aDoc.lastModifiedTime.toDate())
  aDoc.expirationDate && typeof aDoc.expirationDate.toDate === 'function' && (aDoc.expirationDate = aDoc.expirationDate.toDate())
  aDoc.date && typeof aDoc.date.toDate === 'function' && (aDoc.date = aDoc.date.toDate())
  if (aDoc.estimateDeliverDate) {
    console.log('******* type: ', aDoc.estimateDeliverDate.constructor.name)
    aDoc.estimateDeliverDate = aDoc.estimateDeliverDate.toDate()
  } 
  return aDoc
}

function sum (collectionSnapshot, field) {
  let total = 0
  collectionSnapshot.forEach(doc => {
    total = total + doc.data()[field]
  })
  return total
}

async function deleteAll (docs) {
  const Confirm = require('prompt-confirm')
  const prompt = new Confirm('Are you sure to delete?')
  let answer = await prompt.run()
  console.log('user asnwer is: ', answer)
  if (answer) {
    let count = 0
    await Promise.all(docs.map(doc => {
      count++
      return doc.ref.delete()
    }))
    console.log(count, ' item(s) deleted')
  }
}

function getPath (name) {
  if (name === '@packages') {
    return 'warehouses/gwzhvO7mMKeQuwklLLzR/packages'
  } else {
    throw Error('unknown path name')
  }
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-p, --path <path>', `path seperated by '/'`)
  .option('-w, --where <where>', `predicates. user single quote if has space. Put S, N, B, D prefix to represent string, number, boolean, datetime. example userKey,==,S123~isConfirm,==,Btrue~createTime,<=,D2018-10-11`)
  .option('-t, --type <type>', `query type: 'count' or 'list'`, 'count')
  .option('-l, --limit <limit>', `max of how many documents should be return. `)
  .option('-o, --orderBy <orderBy>', `sort results order by a field. `)
  .option('-f, --fields <fields>', `only show specific fields. Seperate by ',' `)
  .option('-c, --calculate <calculate>', `calculate again the field: sum `)
  .option('-r, --remove <remove>', `delete all the search result. BE CAREFUL!! `)
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
let {path, where, orderBy, limit, type, remove} = program

if (path.startsWith('@')) path = getPath(path)

if (!path) throw Error('Path is missing')
let query = addBaseQuery(db, path)

if (where) {
  query = addPredicates(query, where)
}

if (orderBy) {
  query = addOrderBy(query, orderBy)
}

if (limit) {
  query = addLimitClause(query, limit)
}

console.log('start query... \n\n\n')
let runnerPromise = query.get()
  .then(snapshot => {
    let isDocumentSnapshot = (typeof snapshot.exists !== 'undefined')
    if (isDocumentSnapshot) {
      if (snapshot.exists) {
        let aDoc = convertDate(snapshot.data())
        aDoc.key = snapshot.id
        console.log('Result:')
        if (program.fields) {
          let logDoc = {}
          program.fields.split(',').forEach(field => {
            logDoc[field] = aDoc[field]
          })
          console.log(logDoc)
        } else {
          console.log(aDoc)
        }
        if (remove === 'all') {
          deleteAll([snapshot])
        }
      } else {
        console.log('No document is found')
      }
    } else {
      if (type === 'list') {
        if (snapshot.size) {
          if (program.calculate === 'sum') {
            console.log('result: ', sum(snapshot, program.field))
          } else { 
            snapshot.forEach(doc => {
              let aDoc = convertDate(doc.data())
              aDoc.key = doc.id
              console.log('----------------------------------------------------------------------------')         
              if (program.fields) {
                let logDoc = {}
                program.fields.split(',').forEach(field => {
                  logDoc[field] = aDoc[field]
                })
                console.log(logDoc)
              } else {
                console.log(aDoc)
              }
            })
          }
        } else {
          console.log('No document is found')
        }
      }
      console.log(`\nTotal ${snapshot.size} document(s) found`)
      if (remove === 'all') {
        deleteAll(snapshot.docs)
      }
    }
  })

Promise.resolve(runnerPromise)
