
const currentTime = new Date()
/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function queryDist (db) {
  const queryStart = new Date('2020-07-20')
  const allActiveOfferDocs = await db.collection('offers/offers/active')
    .where('createTime', '>=', queryStart)
    .get()

  await Promise.all(allActiveOfferDocs.docs.map(doc => updateOfferAndTasks(db, doc)))
 
  console.log('All set')
  return Promise.resolve('All-set')
}

const tenantSiteMap = new Map()

/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 * @param {string} tenantKey 
 * @param {string} key 
 * @param {string} address1 
 */
async function getWarehouseKey (db, tenantKey, key, address1) {
  let sites = tenantSiteMap.get(tenantKey)
  if (sites === undefined) {
    let tenantLimitedInfoDoc = await db.doc('tenantLimitedInfo/' + tenantKey).get()
    let { warehouses } = tenantLimitedInfoDoc.data()
    sites = warehouses.reduce((allSites, warehouse) => 
      [
        ...allSites, 
        ...(warehouse.sites || [])
          .map(site => {
            let newSite = {
              ...site, 
              warehouseName: warehouse.warehouseName,
              warehouseKey: warehouse.warehouseKey
            }
            if (warehouse.orgId) newSite.orgId = warehouse.orgId
            return newSite
          })
      ], []
    )
    tenantSiteMap.set(tenantKey, sites)
  }
  let {warehouseKey = null} = sites.find(site => site.key === key || site.address1 === address1) || {}
  return warehouseKey
}

/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 * @param {import('firebase-admin').firestore.DocumentSnapshot} offerDoc 
 */
async function updateOfferAndTasks (db, offerDoc) {
  let {warehouseKeys, warehouseSites, tenantKey} = offerDoc.data()
  if (
    Array.isArray(warehouseKeys) && 
    warehouseKeys.every(warehouseKey => typeof warehouseKey === 'string')
  ) return
  const batch = db.batch()
  warehouseKeys = [
    ...(new Set(await Promise.all(warehouseSites.map(
      async ({warehouseKey, key, address1}) => warehouseKey || getWarehouseKey(db, tenantKey, key, address1)
    ))))
  ].filter(warehouseKey => warehouseKey)

  batch.update(offerDoc.ref, {
    warehouseKeys, 
    lastModifiedTime: currentTime
  })
  const taskDocs = await db.collection('tasks/tasks/active').where('offerKey', '==', offerDoc.id).get()
  console.log(`-------------`)
  console.log(`offer id [${offerDoc.id}] has fixed, link tasks quantity: ${taskDocs.size}`)
  console.log(`Warehouse keys: ${warehouseKeys.join(', ')}`)
  taskDocs.forEach(doc => {
    batch.update(doc.ref, {warehouseKeys})
  })
  await batch.commit()
}
