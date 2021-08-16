/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function updateLabelServices (db) {
  // collect status [pre-shipment], fix it to [ready]
  await fixLabelsStatus(db, ['pre-shipment'], 'ready')
  // collect status [transit, accepted], fix it to [in transit]
  await fixLabelsStatus(db, ['transit', 'accepted'], 'in transit')
  return 'all-set'
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db 
 * @param {string[]} searchStatus 
 * @param {string} status change to this status
 * @param {number} limit
 * @param {import('firebase-admin').firestore.DocumentSnapshot} startAfter
 */
async function fixLabelsStatus (db, searchStatus, status = 'ready', limit = 100, startAfter = null) {
  let query = db.collection('labels').where('status', 'in', searchStatus).limit(limit)

  if (startAfter) query = query.startAfter(startAfter)

  let snapshot = await query.get()
  let batch = db.batch()

  snapshot.forEach(doc => {
    batch.update(doc.ref, {status})
  })

  await batch.commit()

  console.log(`fix ${snapshot.size} [${searchStatus.join(',')}] to ${status}`)
  if (snapshot.size < 100) return 'done'
  
  return fixLabelsStatus(db, searchStatus, status, limit, snapshot.docs[limit - 1])
}
