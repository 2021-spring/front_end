module.exports = async function fixDist (db, admin) {
  const tenantKey = 'a7e4Sciph1MsepNQGagQ'

  const userInventoryDocs = await db.collection('tenants').doc(tenantKey).collection('inventory').get()

  let promises = userInventoryDocs.docs.map(doc => {
    let {distribution = {}} = doc.data()
    let keysToDelete = []
    let isUpdate = false
    let details = `Tenant: ${tenantKey}, product: ${doc.id}`
    Object.keys(distribution).forEach(key => {
      let dist = distribution[key]
      if (dist.userName === 'self' && dist.uid === tenantKey && dist.warehouseSite === dist.warehouseKey && dist.warehouseKey === tenantKey && dist.siteName) {
        console.log('update product: ', doc.id)
        let addressEncode = `warehouse${doc.id}${Buffer.from(dist.siteName).toString('base64')}`
        if (distribution[addressEncode]) {
          distribution[addressEncode].quantity += dist.quantity
        } else {
          distribution[addressEncode] = {
            uid: dist.uid,
            userName: 'self',
            warehouseSite: `self-${dist.siteName}`,
            siteName: dist.siteName,
            quantity: dist.quantity
          }
        }
        keysToDelete.push(key)
        isUpdate = true
        details += ` $${key} -> ${addressEncode} (${dist.quantity})`
      }
    })
    keysToDelete.forEach(key => {
      delete distribution[key]
    })

    if (isUpdate) {
      let batch = db.batch()
      batch.update(doc.ref, {distribution})
      batch.set(db.collection('manualChangeLogs').doc(getRandomIdByTime(3)), {
        details, 
        actionName: 'fixDistribution',
        createTime: new Date()
      })
      return batch.commit()
    }
    return Promise.resolve('skip')
  })
  let rtn = await Promise.all(promises)
  console.log('Total docs: ', rtn.filter(item => item !== 'skip').length)
  return 'success'
}

function getRandomIdByTime (withDigits = 0) {
  const timeString = Math.floor(new Date().getTime()).toString()
  let lastString = ''
  for (let i = 0; i < withDigits; i++) {
    lastString += Math.floor(Math.random() * 10).toString()
  }
  return timeString + lastString
}
