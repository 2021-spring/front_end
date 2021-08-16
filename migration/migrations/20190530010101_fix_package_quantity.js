module.exports = async function fixPackageQuantity (db) {
  console.log('start reading package data')
  let pkgRef = db.collection('warehouses').doc('gwzhvO7mMKeQuwklLLzR').collection('packages').where('isConfirmed', '==', false)
  let updatePkg = async (doc) => {
    let {quantity} = doc.data()
    if (typeof quantity !== 'number') {
      quantity = quantity ? parseInt(quantity) : 0
      console.log('package key is: ', doc.id)
      await doc.ref.update({quantity})
      return 1
    } else {
      return 0
    }
  }
  console.log('start updating')
  let rtnPkg = await bunchUpdate(pkgRef, updatePkg)

  console.log('Total users updated qty finally: ', rtnPkg)
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
