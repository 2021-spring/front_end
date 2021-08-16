module.exports = async function fixStatistics (db) {
  const warehouseKey = '3vp0Qupl9mDAcEg4PPH8'
  let statDoc = await db.collection('warehouses').doc(warehouseKey).collection('statistics').doc('general').get()
  let site = await db.collection('warehouses').doc(warehouseKey).collection('sites').limit(1).get()
  if (site.size === 0) return 
  let siteKey = site.docs[0].id
  if (statDoc.exists) {
    let newStat = statDoc.data()
    let newRef = db.collection('warehouses').doc(warehouseKey).collection('statistics').doc(`${siteKey}_inbound`)
    await newRef.set({...newStat, warehouseKey, warehouseSite: siteKey, type: 'inbound'})
    return statDoc.ref.delete()
  }
  return 'done'
}

