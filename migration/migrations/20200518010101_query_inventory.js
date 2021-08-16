module.exports = async function query (db) {
  const docs = await db.collection('tenants').where('productIndex', '>', 0).get()
  const tenantKeys = docs.docs.map(doc => doc.id)

  const inventoryDocsArr = await Promise.all(tenantKeys.map(tenantKey => {
    return db
      .collection('tenants')
      .doc(tenantKey)
      .collection('inventory')
      .get()
  }))

  let rtn = []
  inventoryDocsArr.forEach(docs => {
    docs.docs.forEach(doc => {
      let {distribution = {}} = doc.data()
      let {warehouseKey, warehouseSite, uid, quantity} = distribution
      if (quantity !== undefined || warehouseKey || warehouseSite || uid) {
        rtn.push({
          path: doc.ref.path,
          ...distribution
        })
      }
    })
  })

  console.log(rtn)
}