module.exports = async function migrateLocations (db) {
  const warehouseKey = '3vp0Qupl9mDAcEg4PPH8'
  const auditDocs = await db.collection('warehouses').doc(warehouseKey).collection('auditRecords').get()
  const upcDocs = await db.collection('warehouses').doc(warehouseKey).collection('upcs').get()

  await Promise.all(auditDocs.docs.map(doc => {
    const {upcs} = doc.data()
    if (upcs) {
      upcs.forEach(upc => {
        if (typeof upc.location === 'string') {
          upc.location = upc.location.split(',')
        }
      })
      return doc.ref.update({upcs})
    }
    return Promise.resolve('done')
  }))

  await Promise.all(upcDocs.docs.map(doc => {
    const {location} = doc.data()
    if (location !== undefined && typeof location === 'string') {
      const newLoc = location.split(',').filter(item => !!item).map(item => item.trim())
      return doc.ref.update({location: newLoc})
    }
    return Promise.resolve('done')
  }))

  console.log('success')
  return 'success'
}
