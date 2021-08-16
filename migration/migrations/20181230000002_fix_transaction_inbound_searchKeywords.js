function splitProductName (text) {
  let originText = text.toLowerCase()

  text = text.replace(/\n/g, ' ')
  text = text.replace(/,/g, ' ')
  text = text.replace(/\./g, ' ')
  text = text.replace(/，/g, ' ')
  text = text.replace(/。/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()

  let arr = text.toLowerCase().split(' ').filter(item => item !== '' && item !== '-')
  let arr2 = []
  for (let i = 0; i < arr.length - 1; i++) {
    arr2.push(`${arr[i]} ${arr[i + 1]}`)
  }
  arr = [...arr, ...arr2, originText]
  return arr
}

module.exports = async function updateTransactionSearchKeywords (db) {
  console.log('start update fieldForSearch')
  let transactionRef = db.collection('transaction').where('transactionType', '==', 'inbound')
  let count = 0

  let docs = await transactionRef.limit(200).get()

  while (docs.size > 0) {
    let promises = docs.docs.map(doc => {
      if (doc.exists) {
        let aTransaction = doc.data()
        count++
        !aTransaction.productName && console.log(aTransaction)
        let tranckingConfirmed = Array.isArray(aTransaction.trackingConfirmed) ? aTransaction.trackingConfirmed.map(tracking => tracking.toLowerCase()) : []
        return doc.ref.update({searchKeywords: [...splitProductName(aTransaction.productName), ...tranckingConfirmed]})
      }
    })
    await Promise.all(promises)
    console.log('updated fieldForSearch: ', docs.size, count)
    docs = await transactionRef.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }
  console.log('Total update quantity: ', count)
}