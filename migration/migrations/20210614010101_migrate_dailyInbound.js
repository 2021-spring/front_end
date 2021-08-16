module.exports = async function migrateDailyInbound (db) {
  const warehouseKey = '3vp0Qupl9mDAcEg4PPH8'
  const siteDocs = await db.collection('warehouses').doc(warehouseKey).collection('sites').get()
  const siteKeys = siteDocs.docs.map(doc => doc.id)

  for (let siteKey of siteKeys) {
    const inboundDocs = await db.collection('warehouses').doc(warehouseKey).collection('sites').doc(siteKey).collection('dailyInbound').get()

    for (let doc of inboundDocs.docs) {
      let {finishedUpcs = [], upcToQtyMapArray = []} = doc.data()
      const set = new Set(finishedUpcs)
      upcToQtyMapArray.forEach(({key, value}, index) => {
        upcToQtyMapArray[index] = {
          key,
          value: {
            totalQty: value,
            unstowedQty: set.has(key) ? 0 : value
          }
        }
      })

      await doc.ref.update({upcToQtyMapArray, finishedUpcs: null})
    }
  }

  console.log('success')
  return 'success'
}
