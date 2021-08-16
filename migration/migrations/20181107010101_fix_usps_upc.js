let guessCarrier = require('../../src/utils/guessCarrier')

module.exports = function updateUspsUpc (db, server) {
  let warehouseKey
  if (server === 'production-Careful') {
    warehouseKey = 'gwzhvO7mMKeQuwklLLzR'
  } else if (server === 'core') {
    warehouseKey = 'pKoxB0rHOZ0bdUZM4f9B'
  } else {
    warehouseKey = 'M65asdq51Gu0DMUzHhJJ'
  }
  let collectionRef = db.collection('warehouses').doc(warehouseKey).collection('packages')
  return collectionRef.get()
    .then(docs => {
      let totalUpdatedCount = 0
      let firstDoc = ''
      let promises = docs.docs.map(doc => {
        let aPackage = doc.data()
        let trackings = aPackage.trackings
        let keys = Object.keys(trackings)
        let updated = false
        keys.forEach(key => {
          let processTracking = guessCarrier(key).filter(aGuess => aGuess.name === 'usps')
          let uspsTracking = processTracking.length ? processTracking[0].tracking[0] : ''
          let isNeedToUpdate = (uspsTracking && key !== uspsTracking)
          if (isNeedToUpdate) {
            updated = true
            trackings[uspsTracking] = trackings[key]
          }
        })
        if (updated) {
          !firstDoc && (firstDoc = doc.id)
          return collectionRef.doc(doc.id).update({trackings})
            .then(() => { totalUpdatedCount++ })
        } else {
          return Promise.resolve('no need to update')
        }
      })

      return Promise.all(promises)
        .then(() => {
          console.log(`${totalUpdatedCount} items have been updated.`)
        })
    })
}
