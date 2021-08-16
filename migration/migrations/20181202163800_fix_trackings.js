function convertTrackings (trackings) {
  let rtn = []
  Object.keys(trackings).forEach(key => {
    if (key === trackings[key].barcode) {
      rtn.push(key)
    } else {
      rtn.push(key)
      rtn.push(trackings[key].barcode)
    }
  })
  return rtn
}

async function updateTransactionTrackings (db) {
  let count = 0

  let limitQuery = db.collection('transaction').where('transactionType', '==', 'inbound').orderBy('createTime', 'desc')
  let docs = await limitQuery.limit(200).get()

  while (docs.size > 0) {
    let promises = docs.docs.map(doc => {
      let aTransaction = doc.data()
      if (aTransaction.warehouse !== 'warehouse') return Promise.resolve('skip')
      if (aTransaction.packages && aTransaction.packages.length > 0) {
        let packages = aTransaction.packages.map(pkg => {
          if (!Array.isArray(pkg.trackings)) {
            pkg.trackings = convertTrackings(pkg.trackings)
            count++
          }
          pkg.trackingConfirmed = pkg.trackings
          return pkg
        })
        return doc.ref.update({packages: packages})
      } else {
        console.log('transaction missing packages: ', doc.id)
      }
    })
    await Promise.all(promises)
    console.log('updated transaction tracking: ', docs.size, count)
    docs = await limitQuery.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }

  return count
}

async function updateWarehousePackageTrackings (db) {
  let warehousesRef = db.collection('warehouses')
  let count = 0
  
  let docs = await warehousesRef.get()
  let warehouseKeys = docs.docs.map(doc => doc.id)

  for (let i = 0; i < warehouseKeys.length; i++) {
    let limitQuery = warehousesRef.doc(warehouseKeys[i]).collection('packages')
    let docs = await limitQuery.limit(200).get()

    while (docs.size > 0) {
      let promises = docs.docs.map((doc) => {
        let trackings = doc.data().trackings
        if (!Array.isArray(trackings)) {
          trackings = convertTrackings(doc.data().trackings)
          count++
          return doc.ref.update({trackings: trackings})
        }
      })
      await Promise.all(promises)
      console.log('updated package tracking: ', docs.size)
      docs = await limitQuery.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
    }
  }
  return count
}

module.exports = async function updateTrackings (db) {
  let transactionCount = await updateTransactionTrackings(db)
  let warehouseCount = await updateWarehousePackageTrackings(db)

  console.log(`Transactions trackings update success! Updated ${transactionCount} items.`)
  console.log(`Warehouses trackings update success! Updated ${warehouseCount} items.`)
}
