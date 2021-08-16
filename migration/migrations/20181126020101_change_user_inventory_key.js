module.exports = function updateAsin (db) {
  return db.collection('userLimitedInfo').get()
    .then(docs => {
      let count = 0
      let promises = docs.docs.map(doc => {
        return db.collection('userLimitedInfo').doc(doc.id).collection('inventory').get()
          .then(invDocs => {
            return Promise.all(invDocs.docs.map(invDoc => {
              let {tenantKey, productId} = invDoc.data()
              let newKey = `${tenantKey}_${productId}`
              count++
              let batch = db.batch()
              batch.set(db.collection('userLimitedInfo').doc(doc.id).collection('inventory').doc(newKey), invDoc.data())
              batch.delete(invDoc.ref)
              return batch.commit()
            }))
          })
      })

      return Promise.all(promises)
        .then(() => {
          console.log('Total items change: ' + count)
        })
    })
}
