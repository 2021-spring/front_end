
/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 * @param {import('commander').CommanderStatic} program
 */
module.exports = async function (db, program) {
  program
    .option('--offerId <offerIds>', 'The offers id you want to restore', '')
    .parse(process.argv)
  
  const offerIds = program.offerId.split(',')
  if (!offerIds[0]) {
    console.log('Argument:offerId is empty, no offers need to update. exit!')
    return 
  }
  const archivedOfferDoc = await db.collection('offers/offers/archives').where('key', 'in', offerIds).get()

  const batch = db.batch()
  const count = []
  archivedOfferDoc.forEach(doc => {
    const offerId = doc.get('key')
    batch.create(db.doc('offers/offers/active/' + offerId), doc.data())
    batch.delete(doc.ref)
    count.push(offerId)
  })
  await batch.commit()
  console.log('Restore offers: ' + offerIds.join(', '))
  console.log('Success restored offers: ' + count.join(', '))
  return 'all-set'
}
