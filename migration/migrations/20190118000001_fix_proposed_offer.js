module.exports = async function updateProposedOffers (db) {
  console.log('start update proposed offers')
  let proposeRef = db.collection('offers').doc('offers').collection('proposes')
  let count = 0

  let docs = await proposeRef.limit(200).get()

  while (docs.size > 0) {
    let promises = docs.docs.map(doc => {
      if (doc.exists) {
        let aPropose = doc.data()
        count++
        let updating = {}
        updating.originPrice = aPropose.price
        updating.price = aPropose.warehouse === 'self' && aPropose.bonus ? (aPropose.price + aPropose.bonus) : aPropose.price
        aPropose.bonus && (updating.originBonus = aPropose.bonus)
        updating.bonus = 0

        return doc.ref.update(updating)
      }
    })
    await Promise.all(promises)
    console.log('updated proposes: ', docs.size, count)
    docs = await proposeRef.startAfter(docs.docs.slice(-1)[0]).limit(200).get()
  }
  console.log('Total update quantity: ', count)
}