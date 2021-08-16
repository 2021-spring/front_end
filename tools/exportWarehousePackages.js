let program = require('commander')
let admin = require('firebase-admin')
const { orderBy } = require('lodash')
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

async function getPackages (db, warehouseKey, startYear, endYear, upcToNameMap, tenantKeyToOrgIdMap) {
  let isQueryEnd = false
  let startAfter
  let pkgDocs = []
  while (!isQueryEnd) {
    let pkgsRef = startAfter ? 
      db
        .collection('warehouses')
        .doc(warehouseKey)
        .collection('packages')
        .where('createTime', '>=', new Date(`${startYear}-01-01`))
        .where('createTime', '<', new Date(`${endYear}-01-01`))
        .orderBy('createTime')
        .limit(1000)
        .startAfter(startAfter) : 
      db
        .collection('warehouses')
        .doc(warehouseKey)
        .collection('packages')
        .where('createTime', '>=', new Date(`${startYear}-01-01`))
        .where('createTime', '<', new Date(`${endYear}-01-01`))
        .orderBy('createTime')
        .limit(1000)

    let thisBatchDocs = await pkgsRef.get()
    pkgDocs = [...pkgDocs, ...thisBatchDocs.docs]
    let lastDoc = thisBatchDocs.docs[thisBatchDocs.docs.length - 1]
    console.log('finished packages qty: ', pkgDocs.length, '***', 'createTime: ', lastDoc && lastDoc.data().createTime.toDate())
    startAfter = thisBatchDocs.docs[999]
    console.log('startAfter: ', startAfter && startAfter.id)
    if (!startAfter) {
      isQueryEnd = true
    }
  }
  
  let pkgs = pkgDocs.map((doc) => {
    let aPkg = convertTimestampToDateInObj(doc.data())
    let {trackings, upc, quantity, createTime, isConfirmed = false, isAddedToInventory = false, workerName = '', note, isAbnormal = false, organizationKey = ''} = aPkg
    let name = upcToNameMap[upc] || ''
    return {
      tracking: trackings[0],
      upc, 
      quantity, 
      name, 
      datetime: new Date(createTime).toISOString(), 
      isClaimed: isConfirmed, 
      isLinked: isAddedToInventory, 
      operator: workerName, 
      isAbnormal,
      hasNote: !!note,
      orgId: tenantKeyToOrgIdMap[organizationKey]
    }
  })
  return pkgs
}

async function getUpcMap (db, warehouseKey) {
  let upcsRef = db
    .collection('warehouses')
    .doc(warehouseKey)
    .collection('upcs')
  let upcDocs = await upcsRef.get()
  return upcDocs.docs.reduce((acc, doc) => {
    let aUpc = convertTimestampToDateInObj(doc.data())
    let {description, upc} = aUpc
    acc[upc] = description
    return acc
  }, {})
}

async function getOrgMap (db, warehouseKey) {
  let orgRef = db
    .collection('warehouses')
    .doc(warehouseKey)
    .collection('organizations')
  let orgDocs = await orgRef.get()
  return orgDocs.docs.reduce((acc, doc) => {
    let org = convertTimestampToDateInObj(doc.data())
    let {organizationId, tenantName} = org
    acc[doc.id] = organizationId || tenantName
    return acc
  }, {})
}

async function packages2Excel (db, warehouseKey) {
  const upcToNameMap = await getUpcMap(db, warehouseKey)
  const tenantKeyToOrgIdMap = await getOrgMap(db, warehouseKey)
  for (let i = 2018; i < 2022; i++) {
    const pkgs = await getPackages(db, warehouseKey, i, i+1, upcToNameMap, tenantKeyToOrgIdMap)
    let sheet = xlsx.utils.json_to_sheet(pkgs)
    let workBook = {
      SheetNames: [`${i}`],
      Sheets: {}
    }
    workBook.Sheets[`${i}`] = sheet
    xlsx.writeFile(workBook, `packages-${i}.xlsx`)
  }
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-k, --key <key>', `warehouseKey string`)
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

packages2Excel(db, program.key)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })

