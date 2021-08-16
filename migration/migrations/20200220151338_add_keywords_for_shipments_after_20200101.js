/**
 * Set shiments and archived shipments with keywords when the shipment create after 1/1/2020
 * @param {firebase.firestore.Firestore} db
 */
module.exports = async function addKeywordsForShipments (db) {
  const activedShipmentsQuery = await db.collection('shipments').get()
  const archivedShipmentsQuery = await db.collection('archivedShipments')
    .where('createTime', '>=', new Date('1/1/2020'))
    .get()
  const shipments = [
    ...activedShipmentsQuery.docs,
    ...archivedShipmentsQuery.docs
  ]
  return Promise.all(
    shipments.map(shipment => {
      const keywords = getKeywords(shipment.data())
      return keywords.length ?
        shipment.ref.update({ keywords: keywords }) :
        Promise.resolve(1)
    })
  ).then((resolves) => console.log(`
    Update ${shipments.length} shipments
  `))
  // console.log(shipments.map(shipment => getKeywords(shipment.data())))
}

/**
 *  
 * @param {*} shipment 
 * @returns {string[]} keywords
 */
function getKeywords (shipment) {
  const {products = []} = shipment
  return products
    .reduce((pre, cur) => [
      ...pre, 
      cur.upc, 
      ...(cur.asin || []).map(asinItem => asinItem.toUpperCase())
    ], [])
}
