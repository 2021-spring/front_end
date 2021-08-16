
module.exports = async function updateComments (db) {
  console.log('start update comments')
  let transactionRef = db.collection('paymentRequest')
  let count = 0

  let docs = await transactionRef.limit(200).get()

  while (docs.size > 0) {
    let promises = docs.docs.map(doc => {
      if (doc.exists) {
        let aRequest = doc.data()
        let comments = aRequest.comments
        let hasInitialComment = comments && comments.length > 0 && comments[0].createTime.toDate() <= aRequest.createTime.toDate()
        if (comments && comments.length > 0 && !comments[0].createTime) {
          comments[0].createTime = aRequest.createTime
          comments[0].initialComment = true
          count++
          return doc.ref.update({comments})
        } else if (hasInitialComment) {
          comments[0].initialComment = true
          count++
          return doc.ref.update({comments})
        } else  {
          return Promise.resolve('ok')
        }
      }
    })
    await Promise.all(promises)
    console.log('updated comment: ', docs.size, count)
    docs = await transactionRef.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }
  console.log('Total update quantity: ', count)
}