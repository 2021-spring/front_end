
/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function (db) {
  /**
   * 
   * @param {string} tenantKey 
   */
  async function addProcessTimeToOrdersByTenant (tenantKey) {
    const processedOrders = await db.collection(`tenants/${tenantKey}/orders`).where('status', 'in', ['closed', 'partial', 'archived']).get()
    if (!processedOrders.size) {
      console.log(`${tenantKey}: no need to update`)
      return
    }
    const batch = db.batch()
    let count = 0
    processedOrders.forEach(doc => {
      const {processTime, lastModifiedTime} = doc.data()
      if (!processTime) {
        batch.update(doc.ref, {processTime: lastModifiedTime})
        count += 1
      }
    })
    console.log(`${tenantKey}: updated ${count} orders`)
    batch.commit()
  }

  const admin = await db.doc('sysAdmin/general').get()
  const {betaFeatures = {}} = admin.data()

  let list = betaFeatures.labelAndOrder
  if (!list || !list.length || list.includes('all')) {
    const tenantLimitedInfoDocs = await db.collection('tenantLimitedInfo').get() 
    list = tenantLimitedInfoDocs.docs.map(doc => doc.id)
  }
  await Promise.all(list.map(key => addProcessTimeToOrdersByTenant(key)))
  return 'all-set'
}
