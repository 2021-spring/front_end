module.exports = async function fixChangeLog (db) {
  let transRef = db.collection('transferTransactions')

  let updateLog = async (doc) => {
    await doc.ref.update({isCanceled: false})
    return 1
  }
  console.log('start updating')
  let rtnLog = await bunchUpdate(transRef, updateLog)

  console.log('Total logs updated qty finally: ', rtnLog)
}

async function bunchUpdate (ref, updateFunction, batchQuantity) {
  if (!batchQuantity) batchQuantity = 200
  let docs = await ref.limit(batchQuantity).get()
  let count = 0
  while (docs.size > 0) {
    let promises = docs.docs.map(async (doc) => {
      if (doc.exists) {
        let qty = await updateFunction(doc)
        count += qty
        return qty
      }
    })
    let rtn = await Promise.all(promises)
    console.log('The iteration updated size: ', rtn.reduce((sum, item) => {
      return (sum + item)
    }, 0))
    docs = await ref.startAfter(docs.docs.slice(-1)[0]).limit(batchQuantity).get()
  }
  return count
}