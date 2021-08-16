module.exports = function fixProductTransfer (db) {
  let activeOfferDocs = db.collection('transferTransactions').get()
  return activeOfferDocs
    .then(docs => {
      console.log(`Found ${docs.docs.length} transfer transactions.`)
      let promises = docs.docs.map(doc => {
        let {location, createTime, items, productName = '', productId = '', quantity = 0, upc = '', userName, warehouseKey, warehouseSite, uid, from, to, involvedKeys} = doc.data()
        if (!items) {
          let fbmKey = `warehouse${productId}${warehouseSite}`
          let payload = {transactionId: getRandomIdByTime(createTime), items: [{name: productName, fbmKey, productId, toShip: quantity, upc, userName, warehouseKey, warehouseSite, unitPrice: 0, uid}], involvedKeys: [...involvedKeys, `${from}_${upc}`, `${to}_${upc}`], siteName: location, userName: ''}
          return doc.ref.update(payload)
        }
        items.forEach(item => {
          item.unitPrice || (item.unitPrice = 0)
          item.productId || (item.productId = productId)
          item.siteName || (item.siteName = location)
        })
        let payload = {transactionId: getRandomIdByTime(createTime), involvedKeys: [...involvedKeys, `${from}_${upc}`, `${to}_${upc}`], userName: '', items}
        return doc.ref.update(payload)
      })

      return Promise.all(promises)
        .then(() => {
          console.log(`${promises.length} items have been checked.`)
        })
    })
}

function getRandomIdByTime (createTime, withDigits = 3) {
  const timeString = Math.floor(createTime.toDate().valueOf() / 1000).toString()
  let lastString = ''
  for (let i = 0; i < withDigits; i++) {
    lastString += Math.floor(Math.random() * 10).toString()
  }
  return timeString + lastString
}
