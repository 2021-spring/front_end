module.exports = async function migrateShipmentSN (db) {
  const startTime = '2020-07-01'
  const endTime = '2021-07-18'

  const shipmentDocs = await db.collection('archivedShipments')
    .where('createTime', '<', new Date(endTime))
    .where('createTime', '>', new Date(startTime))
    .get()

  for (let doc of shipmentDocs.docs) {
    let {keywords} = doc.data()
    await doc.ref.update({keywords: keywords.map(item => item.toUpperCase())})
  }

  console.log('success')
  console.log('Total docs updated: ', shipmentDocs.docs.length)
  return 'success'
}
