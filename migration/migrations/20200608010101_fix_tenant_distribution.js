module.exports = async function queryDist (db, admin) {
  
  const tenantKey = '2Hcmc1wrUmKVJdbCVDlV'
  const productId = '00000400'

  const userInventoryDocs = await db.collectionGroup('inventory')
    .where('tenantKey', '==', tenantKey)
    .where('productId', '==', productId)
    .get()

  const rtn = userInventoryDocs.docs.map(doc => doc.data())
  console.log('Succeeded.')
  console.log('Docs: ', rtn)
}