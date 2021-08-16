module.exports = async function fixStatistics (db) {
  const warehouseKey = '3vp0Qupl9mDAcEg4PPH8'
  await fixInbound(warehouseKey, db)
  await fixOutbound(warehouseKey, db)
  return 'success'
}

async function fixInbound (warehouseKey, db) {
  const packageDocs = await db.collection('warehouses').doc(warehouseKey).collection('packages')
    .where('createTime', '>=', new Date('2021-01-25'))
    .where('createTime', '<=', new Date('2021-01-26'))
    .get()

  let siteKeyToStatistics = {}

  packageDocs.forEach(doc => {
    const {quantity, trackings, warehouseSite, workerKey, workerName} = doc.data()
    siteKeyToStatistics[warehouseSite] = siteKeyToStatistics[warehouseSite] || {
      items: 0, 
      packages: 0, 
      units: 0, 
      trackingsSet: new Set(),
      workers: []
    }
    siteKeyToStatistics[warehouseSite].units += quantity
    siteKeyToStatistics[warehouseSite].items += 1

    const isAddPackages = !siteKeyToStatistics[warehouseSite].trackingsSet.has(trackings[0])
    isAddPackages && (siteKeyToStatistics[warehouseSite].packages += 1)

    let targetWorker = siteKeyToStatistics[warehouseSite].workers.find(worker => worker.workerKey === workerKey)
    if (targetWorker) {
      isAddPackages && (targetWorker.packages += 1)
    } else {
      siteKeyToStatistics[warehouseSite].workers.push({
        packages: isAddPackages ? 1 : 0,
        workerKey,
        workerName
      })
    }
    siteKeyToStatistics[warehouseSite].trackingsSet.add(trackings[0])
  })

  await Promise.all(Object.entries(siteKeyToStatistics).map(([siteKey, statistics]) => {
    return db.runTransaction(async transaction => {
      const doc = await transaction.get(db.collection('warehouses').doc(warehouseKey).collection('statistics').doc(`${siteKey}_inbound`))
      let {dailyStat = []} = doc.data() || {}

      let targetDate = dailyStat.find(item => item.dateKeyStr === '2021-01-25')
      if (targetDate) {
        targetDate.items = statistics.items
        targetDate.packages = statistics.packages
        targetDate.units = statistics.units
        targetDate.workers = []
        
        statistics.workers.forEach(worker => {
          let targetWorker = targetDate.workers.find(wker => wker.workerKey === worker.workerKey)
          if (targetWorker) {
            targetWorker.packages += worker.packages
          } else {
            targetDate.workers.push(worker)
          }
        })
      } else {
        dailyStat.push({
          dateKeyStr: '2021-01-25',
          ...statistics
        })
        dailyStat.sort((a, b) => a.dateKeyStr - b.dateKeyStr)
      }
      while (dailyStat.length > 365) {
        this.data.dailyStat.shift()
      }

      transaction.update(doc.ref, {dailyStat})
    })
  }))
  return 'success'
}

async function fixOutbound (warehouseKey, db) {
  const shipmentDocs = await db.collection('archivedShipments')
    .where('createTime', '>=', new Date('2021-01-25'))
    .where('createTime', '<=', new Date('2021-01-26'))
    .where('warehouseKey', '==', warehouseKey)
    .get()

  let siteKeyToStatistics = {}

  shipmentDocs.forEach(doc => {
    const {products, packageQty, workerKey, workerName} = doc.data()
    let warehouseSite

    products.forEach(dist => {
      const {warehouseSite: siteKey, toShip} = dist
      siteKeyToStatistics[siteKey] = siteKeyToStatistics[siteKey] || {
        packages: 0, 
        units: 0,
        workers: []
      }
      siteKeyToStatistics[siteKey].units += toShip
      warehouseSite = siteKey
    })

    siteKeyToStatistics[warehouseSite].packages += packageQty
    
    let targetWorker = siteKeyToStatistics[warehouseSite].workers.find(worker => worker.workerKey === workerKey)
    if (targetWorker) {
      targetWorker.packages += packageQty
    } else {
      siteKeyToStatistics[warehouseSite].workers.push({
        workerKey,
        workerName,
        packages: packageQty
      })
    }
  })

  await Promise.all(Object.entries(siteKeyToStatistics).map(([siteKey, statistics]) => {
    return db.runTransaction(async transaction => {
      const doc = await transaction.get(db.collection('warehouses').doc(warehouseKey).collection('statistics').doc(`${siteKey}_outbound`))
      let {dailyStat = []} = doc.data() || {}

      let targetDate = dailyStat.find(item => item.dateKeyStr === '2021-01-25')
      if (targetDate) {
        targetDate.items = statistics.items
        targetDate.packages = statistics.packages
        targetDate.workers = []
        
        statistics.workers.forEach(worker => {
          let targetWorker = targetDate.workers.find(wker => wker.workerKey === worker.workerKey)
          if (targetWorker) {
            targetWorker.packages += worker.packages
          } else {
            targetDate.workers.push(worker)
          }
        })
      } else {
        dailyStat.push({
          dateKeyStr: '2021-01-25',
          ...statistics
        })
        dailyStat.sort((a, b) => a.dateKeyStr - b.dateKeyStr)
      }
      while (dailyStat.length > 365) {
        this.data.dailyStat.shift()
      }

      transaction.update(doc.ref, {dailyStat})
    })
  }))
  return 'success'
}