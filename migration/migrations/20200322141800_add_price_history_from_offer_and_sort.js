/**
 * @typedef PriceHistory
 * @property {string} tenantKey
 * @property {ProductCollection[]} products
 * 
 * @typedef ProductCollection
 * @property {string} productId
 * @property {offerPriceHistoryItem[]} priceHistoryItems
 * 
 * @typedef offerPriceHistoryItem
 * @property {'offerWarehouse' | 'offerSelf'} type
 * @property {string} offerId
 * @property {number} price
 * @property {number} [bonus]
 * @property {number} quantity
 * @property {Date} dateTime
 */

// Define these before run
const END_DATE = '6/1/2019'
const START_DATE = '1/1/2019'
const QUERY_LIMIT = 5000

/**
 * scan transaction inbound data 
 * 
 * @param {firebase.firestore.Firestore} db
 */
module.exports = async function scanOfferTransactionsAndSetToPriceHistory (db) {
  // set the value before run
  let isGotTheEnd = false

  /** @type {firebase.firestore.DocumentSnapshot | undefined}  */
  let startAfter

  let iterationCount = 0

  while (!isGotTheEnd) {
    iterationCount += 1
    console.log(`***** current iterationCount ${iterationCount} *****`)
    // query Data
    let query = db.collection('transaction').where('transactionType', '==', 'inbound')

    if (END_DATE) query = query.where('createTime', '<=', new Date(END_DATE))

    if (START_DATE) query = query.where('createTime', '>', new Date(START_DATE))

    if (startAfter) query = query.startAfter(startAfter)

    if (QUERY_LIMIT) query = query.limit(QUERY_LIMIT)
    else isGotTheEnd = true
    
    console.log(`\n******* start reading ${QUERY_LIMIT} transactions`)

    const offerTransactions = await query.get()
    
    console.log(`******* return ${offerTransactions.size} transactions\n`)

    if (
      offerTransactions.size > 0 &&
      offerTransactions.size === QUERY_LIMIT
    ) startAfter = offerTransactions.docs[offerTransactions.size - 1]
    else isGotTheEnd = true

    // Reduce Query Data
    const priceHistories = reduceTransactionsData(offerTransactions.docs)

    await mergeToPriceHistoryStore(db, priceHistories)
  }
}

/**
 * 
 * @param {firebase.firestore.Firestore} db
 * @param {PriceHistory[]} priceHistories 
 */
function mergeToPriceHistoryStore (db, priceHistories) {
  return Promise.all(priceHistories.reduce((preVal, {products, tenantKey}) => [
    ...preVal,
    ...products.map(async ({priceHistoryItems, productId}) => {
      if (priceHistoryItems && priceHistoryItems.length === 0) {
        console.log(`${tenantKey} - ${productId} - no price history to update`)
        return Promise.resolve('no items')
      }
      return db.runTransaction(async transaction => {
        const priceHistory = await transaction.get(db.doc(`tenants/${tenantKey}/priceHistory/${productId}`))
        const {inbound} = priceHistory.data() || {inbound: []}
        inbound.forEach(element => { element.dateTime = element.dateTime.toDate() })
        priceHistoryItems.forEach(item => {
          const priceHistoryInboundItem = inbound.find(dupItem => 
            dupItem.offerId === item.offerId &&
            dupItem.price === item.price &&
            dupItem.type === item.type && (
              item.type === 'offerSelf' ? dupItem.bonus === item.bonus : true
            )
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
 * @typedef transactionData
 * @type {object}
 * @property {string} offerKey
 * @property {number} price
 * @property {number} bonus
 * @property {string} productId
 * @property {firebase.firestore.Timestamp} createTime
 * @property {number} quantity
 * @property {string} tenantKey
 * @property {'warehouse' | 'self'} warehouse
 */

/** 
 * @param {firebase.firestore.DocumentSnapshot[]} transactionDocs 
 */
function reduceTransactionsData (transactionDocs) {
  return transactionDocs.reduce(
    /** @param {PriceHistory[]} preVal */
    (preVal, curVal) => {
      /** @type {transactionData} */
      const transactionData = curVal.data()
      const dateTime = transactionData.createTime.toDate()
      const {productId, warehouse, offerKey, bonus, price, quantity} = transactionData

      let tenantCollections = 
        preVal.find(item => item.tenantKey === transactionData.tenantKey) 
      if (!tenantCollections) {
        preVal.push(getNewPriceHistory(transactionData.tenantKey))
        tenantCollections = preVal[preVal.length - 1]
      }

      const priceHistoryInbound = tenantCollections.products.find(item => item.productId === productId)
      const newPriceHistoryItem = getNewOfferPriceHistoryItem(warehouse, offerKey, price, quantity, dateTime, bonus)
      if (priceHistoryInbound) {
        const modifyItem = priceHistoryInbound.priceHistoryItems.find(item => 
          item.offerId === newPriceHistoryItem.offerId &&
          item.price === newPriceHistoryItem.price &&
          item.type === newPriceHistoryItem.type &&
          (item.type === 'offerSelf' ? (item.bonus === newPriceHistoryItem.bonus) : true)
        )
        if (!modifyItem) priceHistoryInbound.priceHistoryItems.push(newPriceHistoryItem)
        else modifyItem.quantity += newPriceHistoryItem.quantity
      } else {
        tenantCollections.products.push({
          productId,
          priceHistoryItems: [newPriceHistoryItem]
        })
      }
      return preVal
    }, []
  )
}

/**
 * this struct just work in this file
 * @param {string} tenantKey 
 * @returns {PriceHistory}
 */
function getNewPriceHistory (tenantKey) {
  return {
    tenantKey,
    products: []
  }
}

function getNewOfferPriceHistoryItem (
  type = 'warehouse', 
  offerId = '',
  price = 0, 
  quantity = 0, 
  dateTime = new Date(), 
  bonus = 0
) {
  switch (type) {
    case 'warehouse':
      return {
        type: 'offerWarehouse',
        offerId,
        price,
        quantity,
        dateTime
      }
    case 'self':
      return {
        type: 'offerSelf',
        offerId,
        price,
        quantity,
        dateTime,
        bonus
      }
    default:
      return {}
  }
}
