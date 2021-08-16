/**
 * 1. get all warehouse side inventory distribution records and related tenantKeys.
 * 2. get all tenant side inventory distribution records with keys upon.
 * 3. get all active shipments related.
 * 4. get all active transfers related.
 * 5. expectation: activeShipments + activeTransfers + tenantInventory === warehouseInventory
 * 6. todo: consider unlinked packages. Should purge all misclassified unlinked packages. 
 * 
 */

let program = require('commander')
let admin = require('firebase-admin')

async function getActiveShipments (warehouseKey, warehouseSite) {
  const shipmentDocs = await db
    .collection('shipments')
    .where('warehouseKey', '==', warehouseKey)
    .get()
  
  let map = new Map()
  shipmentDocs.forEach(doc => {
    let {products, tenantKey} = doc.data()
    products.forEach(product => {
      if (product.warehouseSite === warehouseSite) {
        let {toShip, upc} = product
        if (!map.has(`${tenantKey}_${upc}`)) {
          map.set(`${tenantKey}_${upc}`, 0)
        }
        map.set(`${tenantKey}_${upc}`, map.get(`${tenantKey}_${upc}`) + toShip)
      }
    })
  })

  return map
}

async function getActiveTransfers (warehouseKey, warehouseSite) {
  const transactionDocs = await db
    .collection('transferTransactions')
    .where('warehouseKey', '==', warehouseKey)
    .where('warehouseSite', '==', warehouseSite)
    .where('isPending', '==', true)
    .get()
  
  let map = new Map()
  transactionDocs.forEach(doc => {
    let {from, items} = doc.data()
    let tenantKey = from
    items.forEach(item => {
      let {toShip, upc} = item
      if (!map.has(`${tenantKey}_${upc}`)) {
        map.set(`${tenantKey}_${upc}`, 0)
      }
      map.set(`${tenantKey}_${upc}`, map.get(`${tenantKey}_${upc}`) + toShip)
    })
  })

  return map
}

async function getWarehouseInventory (warehouseKey, warehouseSite) {
  let warehouseInventoryDocs = await db
    .collection('warehouses')
    .doc(warehouseKey)
    .collection('inventory')
    .where('siteKey', '==', warehouseSite)
    .get()
  
  let inventoryMap = new Map()
  let tenantKeySet = new Set()
  warehouseInventoryDocs.forEach(doc => {
    let {tenantKey, distribution = {}} = doc.data()
    Object.keys(distribution).forEach(upc => {
      inventoryMap.set(`${tenantKey}_${upc}`, distribution[upc])
    })
    tenantKeySet.add(tenantKey)
  })

  return {inventoryMap, tenantKeySet}
}

async function getTenantInventory (tenantKey, warehouseKey, warehouseSite) {
  let inventoryDocs = await db
    .collection('tenants')
    .doc(tenantKey)
    .collection('inventory')
    .where('quantity', '>', -9999)
    .get()
  
  let map = new Map()
  inventoryDocs.forEach(doc => {
    let {distribution = {}, upc} = doc.data()
    Object.keys(distribution).forEach(key => {
      if (upc) {
        let value = distribution[key]
        if ((key === `warehouse${doc.id}${warehouseSite}`) || (value.warehouseKey === warehouseKey && value.warehouseSite === warehouseSite)) {
          map.set(`${tenantKey}_${upc}`, value.quantity)
          if (!value.warehouseKey) {
            console.log('***Distribution missing warehouseKey: ', tenantKey, doc.id, upc, key)
          }
        }
      }
    })
  })

  return map
}

async function getTenantAndWarehouseDiff (warehouseKey, warehouseSite) {
  const {inventoryMap, tenantKeySet} = await getWarehouseInventory(warehouseKey, warehouseSite)
  const warehouseInventoryMap = inventoryMap
  let tenantKeys = [...tenantKeySet]
  let promises = tenantKeys.map(tenantKey => getTenantInventory(tenantKey, warehouseKey, warehouseSite))
  let maps = await Promise.all(promises)
  let tenantInventoryMap = maps.reduce((acc, map) => {
    return new Map([...acc, ...map])
  }, new Map())

  let shipmentMap = await getActiveShipments(warehouseKey, warehouseSite)
  let transferMap = await getActiveTransfers(warehouseKey, warehouseSite)
  // console.log({
  //   shipmentMap,
  //   transferMap,
  //   warehouseInventoryMap,
  //   data: tenantInventoryMap.get(`2Hcmc1wrUmKVJdbCVDlV_190199256828`)
  // })
  shipmentMap.forEach((qty, key) => {
    if (!tenantInventoryMap.has(key)) {
      tenantInventoryMap.set(key, 0)
    }
    tenantInventoryMap.set(key, tenantInventoryMap.get(key) + qty)
  })

  transferMap.forEach((qty, key) => {
    if (!tenantInventoryMap.has(key)) {
      tenantInventoryMap.set(key, 0)
    }
    tenantInventoryMap.set(key, tenantInventoryMap.get(key) + qty)
  })

  warehouseInventoryMap.forEach((qty, key) => {
    if (tenantInventoryMap.has(key)) {
      tenantInventoryMap.set(key, tenantInventoryMap.get(key) - qty)
    }
  })
  return tenantInventoryMap
}

// async function checkInventory (warehouseKey, warehouseSite) {
//   let diffMap = await getTenantAndWarehouseDiff(warehouseKey, warehouseSite)

//   let promises = [...diffMap].map(([key, qty]) => {
//     let [tenantKey, upc] = key.split('_')
//     return db
//       .collection('warehouses')
//       .doc(warehouseKey)
//       .collection('packages')
//       .where('upc', '==', upc)
//       .where('organizationKey', '==', tenantKey)
//       .get()
//   })

//   const pkgDocsArr = await Promise.all(promises)
//   pkgDocsArr.forEach(docs => {
//     docs.forEach(doc => {
//       let {organizationKey, upc, quantity} = doc.data()
//       diffMap.set(`${organizationKey}_${upc}`, diffMap.get(`${organizationKey}_${upc}`) - quantity)
//     })
//   })

//   return diffMap
// }

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-k, --warehouseKey <warehouseKey>', 'warehouseKey')
  .option('-s, --warehouseSite <warehouseSite>', 'warehouseSite')
  .parse(process.argv)

const {warehouseKey, warehouseSite} = program
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

getTenantAndWarehouseDiff(warehouseKey, warehouseSite)
  .then(rtn => {
    let output = new Map([...rtn].filter(item => item[1] !== 0))
    console.log(output)
  })
