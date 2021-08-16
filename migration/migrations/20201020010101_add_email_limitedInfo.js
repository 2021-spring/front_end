module.exports = async function fixLimitedInfo (db, admin) {
  const tenantLimitedDocs = await db.collection('tenantLimitedInfo').get()
  const warehouseLimitedDocs = await db.collection('warehouseLimitedInfo').get()

  let tenantPromises = tenantLimitedDocs.docs.map(doc => db.runTransaction(async transaction => {
    const tenantDoc = await transaction.get(db.collection('tenants').doc(doc.id))
    if (!tenantDoc.exists) return
    const {email} = tenantDoc.data()
    console.log('tenant: ', doc.id)
    transaction.update(doc.ref, {email})
  }))

  let warehousePromises = warehouseLimitedDocs.docs.map(doc => db.runTransaction(async transaction => {
    const warehouseDoc = await transaction.get(db.collection('warehouses').doc(doc.id))
    if (!warehouseDoc.exists) return
    const {users} = warehouseDoc.data()
    console.log('warehouse: ', doc.id)
    transaction.update(doc.ref, {email: users[0].email})
  }))

  let rtn = await Promise.all([...tenantPromises, ...warehousePromises])
  console.log('Total docs: ', rtn.length)
  return 'success'
}
