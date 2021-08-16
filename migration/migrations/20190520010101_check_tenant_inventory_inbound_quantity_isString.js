module.exports = async function checkTenantInventoryStringQty (db) {
  console.log('start reading tenant data')
  let tenantRef = db.collection('tenants').where('productIndex', '>=', 0) 
  let tenantDocs = await tenantRef.get()
  let promises = tenantDocs.docs.map(async doc => {
    if (doc.exists) {
      let inventoryDocs = await db.collection('tenants').doc(doc.id).collection('inventory').get()
      inventoryDocs.forEach(anInventory => {
        let {quantity, inbound} = anInventory.data()
        if (typeof quantity === 'string' || typeof inbound === 'string') {
          console.log({tenantId: doc.id, inventoryId: anInventory})
        }
      })
      return Promise.resolve()
    }
  })
  await Promise.all(promises)
  console.log('Fix finished')
}

