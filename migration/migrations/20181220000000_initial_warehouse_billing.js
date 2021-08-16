/*
  note: 
  1. this only works when one product only has on upc which is true at the time of this migration is created
  2. it only work on easygo warehouse
*/
let admin = require('firebase-admin')

module.exports = function initialWarehouseBilling (db, server) {
  let warehouseKey
  if (server === 'production-Careful') {
    warehouseKey = 'gwzhvO7mMKeQuwklLLzR'
  } else if (server === 'core') {
    warehouseKey = 'eNljO9IbAdeldCM6CfB6'
  } else {
    warehouseKey = 'M65asdq51Gu0DMUzHhJJ'
  }

  return countPackages(db, warehouseKey)
}

function countPackages (db, warehouseKey) {
  let count = 0
  return db.collection('warehouses').doc(warehouseKey).collection('packages').get()
    .then(pkgs => {
      let change = {}
      count = pkgs.size
      console.log('total packages: ', count)
      pkgs.forEach(pkg => {
        let {organizationKey, upc, quantity, createTime} = pkg.data()
        if (!createTime) {
          console.log('Missing create time: ', pkg.id)
          return
        }
        createTime = createTime.toDate()
        let month = createTime.getMonth()
        if (!organizationKey || !upc || !quantity) return
        let warehouseBillingKey = `${organizationKey}_${upc}_${month}`
        if (!change[warehouseBillingKey]) change[warehouseBillingKey] = {tenantKey: organizationKey, month, upc, quantity: 0, lastModifiedTime: admin.firestore.FieldValue.serverTimestamp()}
        change[warehouseBillingKey].quantity += quantity
      })
      return Promise.all(Object.keys(change).map(warehouseBillingKey => {
        let docRef = db.collection('warehouses').doc(warehouseKey).collection('billing').doc(warehouseBillingKey)
        docRef.set(change[warehouseBillingKey])
      }))
        .then(() => {
          console.log('finished')
        })
    })
}
