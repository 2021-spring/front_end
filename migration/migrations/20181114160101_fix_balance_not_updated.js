
/*
  note: need to update "searchDate" before run.
  Rerunable: yes
*/
// add number with decimal
let Decimal = require('decimal.js')
function addNumbers (...items) {
  return items.reduce((sum, item) => {
    if (!item) item = 0
    return sum.plus(item)
  }, new Decimal(0)).toDP(2).toNumber()
}

function updateBalance (db, perTenantSnapshot, userKey, tenantKey) {
  let balanceRef = db.collection('balance').doc(`${tenantKey}_${userKey}`)
  return balanceRef.get()
    .then(doc => {
      if (!doc.exists) return Promise.resolve('no ops')
      let balanceData = doc.data()
      console.log('balance update now')
      let {total, pending} = perTenantSnapshot
      if (pending === undefined) {
        pending = 0
        console.log(`*********${tenantKey}_${userKey} pending is undefined`)
      }
      if (total === balanceData.total && pending === balanceData.pending) {
        console.log('----------no need to update')
        return Promise.resolve('no ops')
      } 
      
      console.log({total, pending})
      return doc.ref.update({total, pending})
    })
}

function updateTransaction (db, transaction) {
  let {ref, newTotalBalance, supposedBalance} = transaction
  return ref.update({newTotalBalance: supposedBalance, errorBalance: newTotalBalance})
}

module.exports = async function fixBalance (db, server) {
  let searchDate = new Date('2018-11-01T01:00:00Z')
  console.log('search from time: ', searchDate.toString())
  let collectionRef = db.collection('transaction')
  let collectionQuery = collectionRef.where('createTime', '>', searchDate).orderBy('createTime')
  let docs = await collectionQuery.get()
  console.log(`Total transaction: `, docs.size)
  let totalUpdatedCount = 0
  let transactionByUserKey = {}
  docs.forEach(doc => {
    let transaction = doc.data()
    transaction.ref = doc.ref
    let {userKey, tenantKey, newTotalBalance} = transaction
    let {price, warehouse, bonus, quantity, transactionType, isPayment, amount, isPending} = transaction
    let userSnapshot = transactionByUserKey[userKey] || {}
    let perTanantSnapshot = userSnapshot[tenantKey] || {total: 0, pending: 0, history: []}
    if (perTanantSnapshot.history.length === 0) {
      transaction.supposedBalance = newTotalBalance
      perTanantSnapshot.total = newTotalBalance
      perTanantSnapshot.pending = isPending ? newTotalBalance : 0
      perTanantSnapshot.history.push(transaction)
    } else {
      let newTotal
      let newPending = perTanantSnapshot.pending
      if (transactionType === 'inbound') {
        let cost = ((price + (warehouse === 'self') * (bonus || 0)) * quantity)
        newTotal = addNumbers(perTanantSnapshot.total, cost)
        newPending = isPending ? addNumbers(perTanantSnapshot.pending, cost) : perTanantSnapshot.pending
      } else if (transactionType === 'payment' && isPayment) {
        newTotal = addNumbers(perTanantSnapshot.total, -amount)
      } else if (transactionType === 'payment' && !isPayment) {
        newTotal = addNumbers(perTanantSnapshot.total, amount)
      } else if (transactionType === 'reportLost') {
        newTotal = addNumbers(perTanantSnapshot.total, -amount)
      }
      
      transaction.supposedBalance = newTotal
      transaction.supposedPending = newPending
      perTanantSnapshot.total = newTotal
      perTanantSnapshot.pending = newPending
      perTanantSnapshot.history.push(transaction)
    }
    let needUpdate = (newTotalBalance !== transaction.supposedBalance)
    needUpdate && totalUpdatedCount++
    userSnapshot[tenantKey] = perTanantSnapshot
    transactionByUserKey[userKey] = userSnapshot
  })

  let userKeys = Object.keys(transactionByUserKey)
  for (let userKey of userKeys) {
    let promises = []
    Object.keys(transactionByUserKey[userKey]).forEach(tenantKey => {
      promises.push(updateBalance(db, transactionByUserKey[userKey][tenantKey], userKey, tenantKey))
      transactionByUserKey[userKey][tenantKey].history.forEach(transactionA => {
        let {newTotalBalance, supposedBalance} = transactionA
        if (newTotalBalance !== supposedBalance) promises.push(updateTransaction(db, transactionA))
      })
    })    
    await Promise.all(promises)
  }

  console.log(`${totalUpdatedCount} transactions have been updated.`)
}
