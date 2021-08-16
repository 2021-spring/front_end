
module.exports = function fixPackage (db, server) {
  let warehouseKey
  if (server === 'production-Careful') {
    warehouseKey = 'gwzhvO7mMKeQuwklLLzR'
  } else if (server === 'core') {
    warehouseKey = 'pKoxB0rHOZ0bdUZM4f9B'
  } else {
    warehouseKey = 'M65asdq51Gu0DMUzHhJJ'
  }

  let searchDate = new Date('2018-11-14')
  let collectionRef = db.collection('warehouses').doc(warehouseKey).collection('packages')
  let collectionQuery = collectionRef.where('isConfirmed', '==', true)
  collectionQuery = collectionQuery.where('createTime', '>=', searchDate)
  return collectionQuery.get()
    .then(docs => {
      console.log(`Total confirmed packages (since ${searchDate.toISOString()}): `, docs.size)
      let totalUpdatedCount = 0
      let promises = docs.docs.map(doc => {
        let aPackage = doc.data()
        let trackings = aPackage.trackings
        let keys = Object.keys(trackings)
        return Promise.all(keys.map(key => {
          let transactionRef = db.collection('transaction').where('packageID', '==', doc.id) // check packageID, not trackingConfirm because on tracking can have mulitiple UPC
          return transactionRef.get()
        }))
          .then(docArray => {
            if (docArray.every(item => item.size === 0)) {
              console.log(`package ${doc.id}, tracking count ${keys.length}, tracking (${keys.join(':')})`.padEnd(115, ' ') + ` --- createTime ${aPackage.lastModifiedTime.toDate()}`)
              ++totalUpdatedCount
              return doc.ref.update({isConfirmed: false})
            }
          })        
      })

      return Promise.all(promises)
        .then(() => {
          console.log(`${totalUpdatedCount} items have been updated.`)
        })
    })
}
