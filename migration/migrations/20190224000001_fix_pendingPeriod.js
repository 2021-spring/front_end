import addDays from 'date-fns/addDays'

module.exports = async function fixPendingPeriods (db) {
  console.log('start reading tenants data')
  let tenantsRef = db.collection('tenantLimitedInfo')

  let updateFunctionOffer = async (doc) => {
    let {pendingPeriod} = doc.data()
    let tenantKey = doc.id
    let refBuilder = (collection) => {
      return db.collection('offers').doc('offers').collection(collection).where('tenantKey', '==', tenantKey)
    }
    let promises = ['active', 'archives', 'proposes'].map(item => {
      return fixField({pendingPeriod}, refBuilder(item))
    })
    let rtn = await Promise.all(promises)

    return rtn.reduce((sum, item) => {
      return (sum + item)
    }, 0)
  }

  let updateFunctionTask = async (doc) => {
    let {pendingPeriod} = doc.data()
    let tenantKey = doc.id
    let taskRef = db.collection('tasks').doc('tasks').collection('active').where('tenantKey', '==', tenantKey)
    return fixField({pendingPeriod}, taskRef)
  }

  let updateFunctionTransaction = async (doc) => {
    let {pendingPeriod} = doc.data()
    let tenantKey = doc.id
    let transactionRef = db.collection('transaction').where('tenantKey', '==', tenantKey).where('transactionType', '==', 'inbound')

    return fixField({}, transactionRef, (doc) => {
      let {createTime} = doc.data()
      let pendingEndDate = addDays(createTime.toDate(), pendingPeriod)
      return {pendingEndDate}
    })
  }

  console.log('start updating')
  let rtnOffer = await bunchUpdate(tenantsRef, updateFunctionOffer)
  let rtnTask = await bunchUpdate(tenantsRef, updateFunctionTask)
  let rtnTransaction = await bunchUpdate(tenantsRef, updateFunctionTransaction)

  console.log('Total offers updated qty finally: ', rtnOffer)
  console.log('Total tasks updated qty finally: ', rtnTask)
  console.log('Total transactions updated qty finally: ', rtnTransaction)
}

async function fixField (updateObject, ref, beforeUpdate) {
  let updateFunction = async (doc) => {
    let obj = {}
    if (beforeUpdate) {
      obj = beforeUpdate(doc)
    }
    await doc.ref.update({...updateObject, ...obj}).catch((error) => console.log(error, doc.data()))
    return 1
  }
  return bunchUpdate(ref, updateFunction)
}

async function bunchUpdate (ref, updateFunction, batchQuantity) {
  if (!batchQuantity) batchQuantity = 200
  let docs = await ref.limit(batchQuantity).get()
  let count = 0
  while (docs.size > 0) {
    let promises = docs.docs.map(async (doc) => {
      if (doc.exists) {
        let qty = await updateFunction(doc)
        count += qty
        return qty
      }
    })
    let rtn = await Promise.all(promises)
    console.log('The iteration updated size: ', rtn.reduce((sum, item) => {
      return (sum + item)
    }, 0))
    docs = await ref.startAfter(docs.docs.slice(-1)[0]).limit(batchQuantity).get()
  }
  return count
}
