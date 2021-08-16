function convertUpc (upc) {
  return Object.keys(upc)[0] || ''
}

async function updateTransactionsUpcs (db) {
  console.log('start update transaction')
  let transactionRef = db.collection('transaction')
  let count = 0
  let limitQuery = transactionRef.where('transactionType', '==', 'inbound').orderBy('createTime', 'desc')

  let docs = await limitQuery.limit(200).get()

  while (docs.size > 0) {
    let promises = docs.docs.map(doc => {
      let aTransaction = doc.data()
      if (aTransaction.warehouse === 'warehouse') {
        let changes = {}
        if (aTransaction.packages && aTransaction.packages.length > 0) {
          let pkgs = aTransaction.packages.map(pkg => {
          if (pkg.upc) {
              delete pkg.upc
            }
            return pkg
          })
          changes.packages = pkgs
        }
        
        if ((typeof aTransaction.upc !== 'string') && !Array.isArray(aTransaction.upc)) {
          count++
          changes.upc = convertUpc(aTransaction.upc)
          return doc.ref.update(changes)
        }
      } else {
        if ((typeof aTransaction.upc !== 'string') && !Array.isArray(aTransaction.upc)) {
          count++
          return doc.ref.update({upc: convertUpc(aTransaction.upc)})
        }
      }
    })
    await Promise.all(promises)
    console.log('updated transaction upc: ', docs.size, count)
    docs = await limitQuery.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }
  return count
}

module.exports = async function updateUpcs (db) {
  let count = 0
  let updatePromises = []

  let reportLostRef = db.collection('reportLost')
  let tenantRef = db.collection('tenants')
  let userLimitedInfoRef = db.collection('userLimitedInfo')
  let shipmentRef = db.collection('shipments')
  let archivedShipmentRef = db.collection('archivedShipments')

  let docs = await Promise.all([reportLostRef.get(), tenantRef.get(), userLimitedInfoRef.get(), shipmentRef.get(), archivedShipmentRef.get()])
  
  let reportLostDoc = docs[0]
  let tenantDoc = docs[1]
  let userLimitedInfoDoc = docs[2]
  let shipmentDoc = docs[3]
  let archivedShipmentDoc = docs[4]
  // Get tenants data
  let tenantKeys = []
  let tenantPromises = []
  tenantDoc.docs.forEach(doc => {
    if (doc.data().productIndex) {
      tenantKeys.push(doc.id)
      tenantPromises.push(tenantRef.doc(doc.id).collection('inventory').get())
    }
  })
  // Get userLimitedInfo data
  let tenantInventoryDocs = await Promise.all(tenantPromises)
  let userLimitedInfoKeys = []
  let userLimitedInfoPromises = []
  userLimitedInfoDoc.forEach(doc => {
    if (doc.data().address) {
      userLimitedInfoKeys.push(doc.id)
      userLimitedInfoPromises.push(userLimitedInfoRef.doc(doc.id).collection('inventory').get())
    }
  })

  let userLimitedInfoInventoryDocs = await Promise.all(userLimitedInfoPromises)
  // Update reportLost
  reportLostDoc.docs.forEach(doc => {
    if (!(typeof doc.data().upc === 'string') && !Array.isArray(doc.data().upc)) {
      count++
      updatePromises.push(doc.ref.update({upc: convertUpc(doc.data().upc)}))
    }
  })
  // Update teants
  tenantKeys.forEach((key, index) => {
    tenantInventoryDocs[index].docs.forEach(doc => {
      if ((typeof doc.data().upc !== 'string') && !Array.isArray(doc.data().upc)) {
        count++
        updatePromises.push(tenantRef.doc(key).collection('inventory').doc(doc.id).update({upc: convertUpc(doc.data().upc)}))
      }
    })
  })
  // Update userLimitedInfo
  userLimitedInfoKeys.forEach((key, index) => {
    userLimitedInfoInventoryDocs[index].forEach(doc => {
      if (!(typeof doc.data().upc === 'string') && !Array.isArray(doc.data().upc)) {
        count++
        updatePromises.push(userLimitedInfoRef.doc(key).collection('inventory').doc(doc.id).update({upc: convertUpc(doc.data().upc)}))
      }
    })
  })
  // Shipments
  shipmentDoc.forEach(doc => {
    let products = doc.data().products
    products.forEach(product => {
      if (!(typeof product.upc === 'string') && !Array.isArray(product.upc)) {
        count++
        product.upc = convertUpc(product.upc)
      }
    })
    updatePromises.push(shipmentRef.doc(doc.id).update({products: products}))
  })
  // ArchivedShipments
  archivedShipmentDoc.forEach(doc => {
    let products = doc.data().products
    products.forEach(product => {
      if (!(typeof product.upc === 'string') && !Array.isArray(product.upc)) {
        count++
        product.upc = convertUpc(product.upc)
      }
    })
    updatePromises.push(archivedShipmentRef.doc(doc.id).update({products: products}))
  })

  await Promise.all(updatePromises)
  console.log(`Upcs update ${count} items before transaction.`)
  count += await updateTransactionsUpcs(db)

  console.log(`Upcs update success! total Updated ${count} items.`)
}
