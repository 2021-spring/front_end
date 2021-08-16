module.exports = function addLastEditTime (db, server) {
  let activeOfferDocs = db.collection('offers').doc('offers').collection('active').get()
  return activeOfferDocs
    .then(docs => {
      console.log(`Found ${docs.docs.length} active offers`)
      let promises = docs.docs.map(doc => {
        let offer = doc.data()
        let {lastModifiedTime, createTime} = offer
        if (offer.lastEditTime) {
          return Promise.resolve('success')
        } else {
          if (!lastModifiedTime && !createTime) {
            console.log(`skip ${doc.id}`)
            return Promise.resolve(`skip ${doc.id}`)
          }
          let lastEditTime = offer.lastModifiedTime ? offer.lastModifiedTime.toDate() : offer.createTime.toDate()
          return doc.ref.update({lastEditTime})
        }
      })

      return Promise.all(promises)
        .then(() => {
          console.log(`${promises.length} items have been checked.`)
        })
    })
}
