module.exports = async function auditToUpc (db) {
  const auditKey = '1617674435276878'
  const warehouseKey = '3vp0Qupl9mDAcEg4PPH8'
  const auditDoc = await db.collection('warehouses').doc(warehouseKey).collection('auditRecords').doc(auditKey).get()

  if (!auditDoc.exists) return 'Audit key not found.'

  const {upcs} = auditDoc.data()
  let qty = 0
  for (let item of upcs) {
    const {upc, location} = item
    if (location && upc) {
      const upcDocs = await db.collection('warehouses').doc(warehouseKey).collection('upcs').where('upc', '==', upc).get()
      if (!upcDocs.size) continue
      const upcDoc = upcDocs.docs[0]
      const {location: originLoc} = upcDoc.data()
      await upcDoc.ref.update({location: [...new Set([...originLoc, ...location])]})
      qty++
    }
  }
  console.log('Updated docs qty: ', qty)
  return 'success'
}
