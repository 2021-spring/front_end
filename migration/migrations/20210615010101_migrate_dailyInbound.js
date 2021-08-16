module.exports = async function migrateDailyInbound (db) {
  const warehouseKey = 'G4CISy7nXRZZfv3kDYPt'
  const siteDocs = await db.collection('warehouses').doc(warehouseKey).collection('sites').get()
  const siteKeys = siteDocs.docs.map(doc => doc.id)

  for (let siteKey of siteKeys) {
    const inboundDocs = await db.collection('warehouses').doc(warehouseKey).collection('sites').doc(siteKey).collection('dailyInbound').get()

    for (let doc of inboundDocs.docs) {
      let {upcToQtyMapArray = []} = doc.data()
      upcToQtyMapArray.forEach((item) => {
        item.value = item.value.totalQty
      })

      await doc.ref.update({upcToQtyMapArray})
    }
  }

  console.log('success')
  return 'success'
}
