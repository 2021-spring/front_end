
module.exports = async function fixTransaction (db, server) {
  let collectionRef = db.collection('transaction')
  let docs = await collectionRef.orderBy('createTime').limit(200).get()
  console.log(`Process first ${docs.size} transactions: `)
  while (docs.size > 0) {
    let totalUpdatedCount = 0
    let promises = docs.docs.map(doc => {
      let transaction = doc.data()
      if (typeof transaction.lastModifiedTime === 'string') {
        totalUpdatedCount++
        let lastModifiedTime = new Date(transaction.lastModifiedTime)
        console.log('found old string type lastModifiedTime: ', doc.id)
        return doc.ref.update({lastModifiedTime})
      } else {
        return Promise.resolve('skip')
      }
    })

    await Promise.all(promises)
    console.log(`${totalUpdatedCount} items have been updated.`)
    docs = await collectionRef.where('createTime', '>', docs.docs.slice(-1)[0].createTime.toDate()).orderBy('createTime').limit(200).get()
  }
  console.log('process finished')
}
