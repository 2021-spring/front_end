function getRandomIdByTime (withDigits = 0) {
  const timeString = Math.floor(new Date().getTime()).toString()
  let lastString = ''
  for (let i = 0; i < withDigits; i++) {
    lastString += Math.floor(Math.random() * 10).toString()
  }
  return timeString + lastString
}

module.exports = async function addKeywordsForShipments (db) {
  const activedShipmentsQuery = await db.collection('shipments').get()
  const archivedShipmentsQuery = await db.collection('archivedShipments')
    .where('createTime', '>=', new Date('12/30/2019'))
    .get()
  const shipments = [
    ...activedShipmentsQuery.docs,
    ...archivedShipmentsQuery.docs
  ]
  return Promise.all(
    shipments.map(shipment => {
      let newId = getRandomIdByTime(3)
      let {createTime, keywords = []} = shipment.data()
      let newShipment = {
        ...shipment.data(),
        shipmentCreateTime: createTime,
        keywords: [...keywords, newId]
      }

      const batch = db.batch()
      batch.set(shipment.ref.parent.doc(newId), newShipment)
      batch.delete(shipment.ref)
      return batch.commit()
    }))
    .then(() => console.log(`
      Update ${shipments.length} shipments
    `))
}
