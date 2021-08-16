/*
  note: 
  1. this only works when one product only has on upc which is true at the time of this migration is created
  2. it only work on easygo warehouse
*/

module.exports = function createWarehouseInventory (db) {
  return copyTenantInventory(db)
    .then(() => {
      return addPendingShipment(db)
    })
    .then(() => {
      return addUnlinkedPackages(db)
    })
}

function copyTenantInventory (db) {
  return db.collection('tenants').get()
    .then(docs => {
      let count = 0
      let promises = docs.docs.map(doc => {
        let key = doc.id
        return db.collection('tenants').doc(key).collection('inventory').get()
          .then(productDocs => {
            return Promise.all(productDocs.docs.map(productDoc => {
              let product = productDoc.data()
              let {upc, distribution} = product
              if (!distribution || Object.keys(distribution).length === 0) return Promise.resolve('skip no warehouse inventory')
              if (!upc || Object.keys(upc).length === 0) return Promise.resolve('skip no upc')
              let warehouseInventories = Object.values(distribution).filter(dist => {
                return !!dist.warehouseKey
              })
              if (warehouseInventories.length === 0) return Promise.resolve('skip no warehouse inventory')
              upc = Object.keys(upc)[0]
              return Promise.all(warehouseInventories.map(warehouseInventory => {
                let payload = {
                  tenantKey: key,
                  siteKey: warehouseInventory.warehouseSite,
                  upc,
                  quantity: warehouseInventory.quantity
                }
                let warehouseInventoryKey = `${key}_${warehouseInventory.warehouseSite}_${upc}`
                count++
                return db.collection('warehouses').doc(warehouseInventory.warehouseKey).collection('inventory').doc(warehouseInventoryKey).set(payload)
              }))
            }))
          })
      })

      return Promise.all(promises)
        .then(() => {
          console.log('Total inventory changes: ' + count)
        })
    })
}

function addPendingShipment (db) {
  let count = 0
  return db.collection('shipments').where('warehouseKey', '>', '').get()
    .then(shipmentDocs => {
      let change = {}
      shipmentDocs.forEach(shipmentDoc => {
        let shipment = shipmentDoc.data()
        let {tenantKey, warehouseKey, products} = shipment
        if (!change[warehouseKey]) change[warehouseKey] = {}
        if (!products || products.length === 0 || !tenantKey) return
        products.forEach(product => {
          let {warehouseSite, upc, toShip} = product
          if (!warehouseSite || !upc) return
          let invKey = `${tenantKey}_${warehouseSite}_${upc}`
          if (!change[warehouseKey][invKey]) change[warehouseKey][invKey] = {tenantKey, warehouseSite, upc, quantity: 0}
          change[warehouseKey][invKey].quantity += toShip
        })
      })
      return Promise.all(Object.keys(change).map(warehouseKey => {
        return Promise.all(Object.keys(change[warehouseKey]).map(docKey => {
          return db.runTransaction(t => {
            let docRef = db.collection('warehouses').doc(warehouseKey).collection('inventory').doc(docKey)
            return t.get(docRef)
              .then(doc => {
                let {tenantKey, warehouseSite, upc, quantity} = change[warehouseKey][docKey]
                count++
                if (!doc.exists) {
                  let payload = {
                    tenantKey,
                    siteKey: warehouseSite,
                    upc,
                    quantity
                  }
                  t.set(docRef, payload)
                } else {
                  let docData = doc.data()
                  t.update(docRef, {quantity: docData.quantity + quantity})
                }
              })
          })
        }))     
      }))
        .then(() => {
          console.log('Total shipment updates change: ' + count)
        })
    })
}

function addUnlinkedPackages (db) {
  let count = 0
  return db.collection('warehouses').doc('gwzhvO7mMKeQuwklLLzR').collection('packages').where('isAddedToInventory', '==', false).get()
    .then(pkgs => {
      let change = {}
      count = pkgs.size
      pkgs.forEach(pkg => {
        let {organizationKey, warehouseSite, upc, quantity} = pkg.data()
        if (!organizationKey || !upc || !quantity) return
        let warehouseInventoryKey = `${organizationKey}_${warehouseSite}_${upc}`
        if (!change[warehouseInventoryKey]) change[warehouseInventoryKey] = {tenantKey: organizationKey, siteKey: warehouseSite, upc, quantity: 0}
        change[warehouseInventoryKey].quantity += quantity
      })
      return Promise.all(Object.keys(change).map(warehouseInventoryKey => {
        return db.runTransaction(t => {
          let docRef = db.collection('warehouses').doc('gwzhvO7mMKeQuwklLLzR').collection('inventory').doc(warehouseInventoryKey)
          return t.get(docRef)
            .then(doc => {
              if (doc.exists) {
                let quantity = doc.data().quantity + change[warehouseInventoryKey].quantity
                t.update(doc.ref, {quantity})
              } else {
                t.set(doc.ref, change[warehouseInventoryKey])
              }
            })
        })
      }))
        .then(() => {
          console.log('Total unlinked packages updates: ' + count)
        })
    })
}
