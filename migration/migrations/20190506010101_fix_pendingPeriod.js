let Decimal = require('decimal.js')

function addNumbers (...items) {
  return items.reduce((sum, item) => {
    return sum.plus(item)
  }, new Decimal(0)).toDP(2).toNumber()
}

module.exports = async function fixPendingPeriod (db) {
  let transactionRef = db.collection('transaction').where('transactionType', '==', 'inbound')
  let transactionDocs = await transactionRef.get()
  let promises = []
  let curTime = new Date()
  let balanceMap = {}
  console.log('Transactions: ')
  transactionDocs.forEach(doc => {
    let {pendingEndDate, tenantKey, userKey, price, bonus, quantity, warehouse, productName, taskKey} = doc.data()
    let amount = warehouse === 'self' ? (addNumbers(price, bonus) * quantity) : (price * quantity)
    if (pendingEndDate === undefined) {
      doc.ref.update({pendingEndDate: curTime})
      if (!balanceMap[`${tenantKey}_${userKey}`]) {
        balanceMap[`${tenantKey}_${userKey}`] = {
          pending: -amount,
          released: amount
        }
      } else {
        balanceMap[`${tenantKey}_${userKey}`].pending += -amount
        balanceMap[`${tenantKey}_${userKey}`].released += amount
      }
      console.log({transactionKey: doc.id, tenantKey, userKey, price, bonus, quantity, warehouse, productName, taskKey})
    }
  })
  Object.keys(balanceMap).forEach(balanceKey => {
    let balanceRef = db.collection('balance').doc(balanceKey)
    let balanceFixTransaction = db.runTransaction(async trans => {
      let balanceDoc = await trans.get(balanceRef)
      let {pending, released} = balanceDoc.data()
      pending += balanceMap[balanceKey].pending
      released += balanceMap[balanceKey].released
      console.log({balanceKey: balanceDoc.id, pendingBefore: balanceDoc.data().pending, releaseBefore: balanceDoc.data().released, pendingAfter: pending, releasedAfter: released})
      return trans.update(balanceRef, {pending, released})
    })
    promises.push(balanceFixTransaction)
  })
  console.log('----------------------------------------------------------------------------') 
  console.log('balanceMap: ')
  console.log(balanceMap)
  return Promise.all(promises)
    .then(() => {
      console.log('fix succeeded.')
    }) 
}
