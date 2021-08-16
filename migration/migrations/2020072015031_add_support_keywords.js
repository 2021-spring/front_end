
/**
 * Add keywords to support case
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function (db) {
  const [
    orgInfoCollection,
    supportCollection
  ] = await Promise.all([
    db.collection('tenantLimitedInfo').get(), 
    db.collection('supports').get()
  ])
  
  const orgIdMap = new Map(orgInfoCollection.docs.reduce((mapArr, doc) => {
    const {warehouses = []} = doc.data()
    return [
      ...mapArr,
      ...warehouses.reduce(
        (orgIds, {orgId, warehouseKey}) => [...orgIds, [`${doc.id}-${warehouseKey}`, orgId]],
        []
      )
    ]
  }, []))

  let errorCounter = 0
  await Promise.all(supportCollection.docs.map(
    doc => doc.ref.update({
      keywords: [
        doc.get('tenantName'),
        orgIdMap.get(`${doc.get('tenantKey')}-${doc.get('warehouseKey')}`),
        doc.get('caseNumber'),
        doc.get('category'),
        ...splitTitle(doc.get('title') || ''),
        doc.get('agentName'),
        doc.get('agentUid')
      ].filter(key => key !== undefined && key !== '')
    })
      .catch(() => {
        errorCounter += 1
        console.error(doc.get('caseNumber') + ' updated field')
        return 'done'
      })
  ))
    .then(writeResults => {
      console.log(`${writeResults.length - errorCounter} cases were updated`)
    })

  if (errorCounter < 1) console.log('All-set!')
  return Promise.resolve('all-set')
}

function splitTitle (text) {
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
