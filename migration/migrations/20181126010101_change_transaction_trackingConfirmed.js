
let admin = require('firebase-admin')

module.exports = async function fixTransaction (db, server) {
  let collectionRef = db.collection('transaction').where('transactionType', '==', 'inbound').orderBy('createTime', 'desc')
  let docs = await collectionRef.limit(200).get()
  while (docs.size > 0) {
    console.log(`----- Process ${docs.size} transactions: `)
    let totalUpdatedCount = 0
    let promises = docs.docs.map(doc => {
      let transaction = doc.data()
      if (transaction.transactionType === 'inbound' && transaction.warehouse === 'warehouse' && typeof transaction.trackingConfirmed === 'string' && !transaction.packages) {
        totalUpdatedCount++
        let trackingConfirmed = [transaction.trackingConfirmed]
        let packages = [{
          packageID: transaction.packageID,
          trackings: transaction.trackings,
          quantity: transaction.quantity,
          upc: transaction.upc
        }]
        let transactionChanges = {
          trackingConfirmed,
          packages,
          trackingNums: admin.firestore.FieldValue.delete(),
          taskIndex: admin.firestore.FieldValue.delete(),
          trackings: admin.firestore.FieldValue.delete(),
          workerKey: admin.firestore.FieldValue.delete(),
          warehouseSite: admin.firestore.FieldValue.delete(),
          date: admin.firestore.FieldValue.delete()
        }
        console.log('updated: ', doc.id)
        return doc.ref.update(transactionChanges)
      } else {
        return Promise.resolve('skip')
      }
    })

    await Promise.all(promises)
    console.log(`${totalUpdatedCount} items have been updated.`)
    docs = await collectionRef.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }
}
