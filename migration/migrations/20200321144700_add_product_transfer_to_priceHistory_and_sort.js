const isSameDay = require('date-fns/isSameDay')
/**
 * @typedef PriceHistory
 * @property {string} tenantKey
 * @property {ProductCollection[]} products
 * 
 * @typedef ProductCollection
 * @property {string} upc
 * @property {TransferPriceHistoryItem[]} priceHistoryItems
 * 
 * @typedef TransferPriceHistoryItem
 * @property {'transfer'} type
 * @property {number} price
 * @property {number} quantity
 * @property {Date} dateTime
 */

/**
 * scan product transfer before input date (default: 3/21/2020)
 * 
 * @param {firebase.firestore.Firestore} db
 */
module.exports = async function scanTransferAndSetToPriceHistory (db) {
  // set the value before run
  let endDate = null
  let startDate = null

  let query = db.collection('transferTransactions')
  if (endDate) query = query.where('createTime', '<=', new Date(endDate))
  if (startDate) query = query.where('createTime', '>', new Date(startDate))
  query.orderBy('createTime')
  const productTransfers = await query.get()
  /** @type {PriceHistory[]} */
  const priceHistories = productTransfers.docs.reduce(
    /** @param {PriceHistory[]} preVal */
    (preVal, curVal) => {
      const transferData = curVal.data()
      if (
        !Array.isArray(transferData.items) ||
        transferData.items.some(({unitPrice = 0}) => !unitPrice) || 
        !transferData.to
      ) return preVal
      const dateTime = transferData.createTime.toDate()
      let tenantCollections = 
        preVal.find(item => item.tenantKey === transferData.to) 
      if (!tenantCollections) {
        preVal.push(getNewPriceHistory(transferData.to))
        tenantCollections = preVal[preVal.length - 1]
      }
      const products = transferData.items || []
      products.forEach(product => {
        const priceHistoryInbound = tenantCollections.products.find(item => item.upc === product.upc)
        const newPriceHistoryItem = getNewTransferItem(product.unitPrice, product.toShip, dateTime)
        if (priceHistoryInbound) {
          const modifyItem = priceHistoryInbound.priceHistoryItems.find(item => {
            return isSameDay(item.dateTime, newPriceHistoryItem.dateTime) &&
            item.price === newPriceHistoryItem.price
          })
          if (!modifyItem) priceHistoryInbound.priceHistoryItems.push(newPriceHistoryItem)
          else modifyItem.quantity += newPriceHistoryItem.quantity
        } else {
          tenantCollections.products.push({
            upc: product.upc,
            priceHistoryItems: [newPriceHistoryItem]
          })
        }
      })
      return preVal
    }, []
  )
  return Promise.all(priceHistories.reduce((preVal, {products, tenantKey}) => [
    ...preVal,
    ...products.map(async ({upc, priceHistoryItems}) => {
      // get product id of this.upc
      if (priceHistoryItems && priceHistoryItems.length === 0) return Promise.resolve('no items')
      const productId = await getProductId(db, tenantKey, upc)
      if (productId === -1) return Promise.resolve('product not exist, skip')
      return db.runTransaction(async transaction => {
        const priceHistory = await transaction.get(db.doc(`tenants/${tenantKey}/priceHistory/${productId}`))
        const {inbound} = priceHistory.data() || {inbound: []}
        inbound.forEach(element => {
          element.dateTime = element.dateTime.toDate()
        })
        priceHistoryItems.forEach(item => {
          const priceHistoryInboundItem = inbound.find(dupItem => 
            dupItem.type === item.type && 
            dupItem.price === item.price &&
            isSameDay(dupItem.dateTime, item.dateTime)
          )
          if (priceHistoryInboundItem) priceHistoryInboundItem.quantity += item.quantity
          else inbound.push(item)
        })
        if (priceHistory.exists) {
          transaction.update(priceHistory.ref, {
            inbound: inbound.sort((a, b) => (a.dateTime - b.dateTime)), 
            lastModifiedTime: new Date()
          })
        } else {
          transaction.set(priceHistory.ref, {
            inbound: inbound.sort((a, b) => (a.dateTime - b.dateTime)), 
            lastModifiedTime: new Date(),
            createTime: new Date()
          })
        }
        console.log(`update ${tenantKey} - priceHistory - ${productId}`)
      })
    })
  ], []))
}

/**
 * 
 * @param {string} tenantKey 
 * @returns {PriceHistory}
 */
function getNewPriceHistory (tenantKey) {
  return {
    tenantKey,
    products: []
  }
}

function getNewTransferItem (price = 0, quantity = 0, dateTime) {
  return {type: 'transfer', price, quantity, dateTime: new Date(dateTime)}
}

/**
 * 
 * @param {firebase.firestore.Firestore} db 
 * @param {string} tenantKey 
 * @param {string} upc 
 */
async function getProductId (db, tenantKey, upc) {
  const productDocs = await db.collection(`tenants/${tenantKey}/inventory`)
    .where('upc', '==', upc)
    .limit(1)
    .get()
  if (productDocs.size > 0) return productDocs.docs[0].id
  console.log(`${tenantKey}, ${upc}, not exist`)
  return -1
}
