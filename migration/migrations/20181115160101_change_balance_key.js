module.exports = async function changeBalanceKey (db, server) {
  let collectionRef = db.collection('balance')
  let docs = await collectionRef.get()
  console.log(`Total balance docs: `, docs.size)
  let totalUpdatedCount = 0
  let promises = docs.docs.map(doc => {
    let balance = doc.data()
    let {userKey, tenantKey} = balance
    if (!userKey || !tenantKey) return Promise.resolve('data missing, skip')
    let newDocKey = `${tenantKey}_${userKey}`
    if (newDocKey === doc.id) return Promise.resolve('doc key is correct, skip')
    let batch = db.batch()
    batch.set(collectionRef.doc(newDocKey), balance)
    batch.delete(doc.ref)
    totalUpdatedCount++
    return batch.commit()
  })
    
  await Promise.all(promises)

  console.log(`${totalUpdatedCount} items have been updated.`)
}
