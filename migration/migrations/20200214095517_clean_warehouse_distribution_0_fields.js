const admin = require('firebase-admin')
/**
 * 
 * @param {firebase.firestore.Firestore} db
 */
module.exports = async function cleanWarehouseDistributionZeroQtyFields (db) {
  const warehouseQuery = await db.collection('warehouseLimitedInfo').get()
  if (warehouseQuery.size === 0) return
  return Promise.all(
    warehouseQuery.docs.map(async doc => {
      const warehouseKey = doc.id
      const inventoryDocs = await db.collection(`warehouses/${warehouseKey}/inventory`).get()
      // make transaction
      return Promise.all(inventoryDocs.docs
        .map(doc => db.runTransaction(transaction => 
          transaction.get(doc.ref)
            .then(inventory => {
              const updateFields = getRemovedZeroDistribution(inventory.data())
              if (updateFields.lastModifiedTime) {
                transaction.update(inventory.ref, updateFields)
                console.log(`Warehouse[${warehouseKey}] Inventory[${inventory.id}] -- has been updated`)
              }
              // console.log(`Warehouse[${warehouseKey}] Inventory[${inventory.id}] -- dont need to update`)
            }))
        ) 
      )
    })
  )
}

function getRemovedZeroDistribution (inventory = {}) {
  let updateFields = {}
  let abnormalDistributiionUpdatedFlag = false
  let distributiionUpdatedFlag = false
  let {abnormalDistribution = {}, distribution = {}} = inventory
  for (const upc in abnormalDistribution) {
    if (abnormalDistribution[upc] === 0) {
      delete abnormalDistribution[upc]
      abnormalDistributiionUpdatedFlag = true
    }
  }
  for (const upc in distribution) {
    if (distribution[upc] === 0) {
      delete distribution[upc]
      distributiionUpdatedFlag = true
    }
  }
  if (abnormalDistributiionUpdatedFlag) updateFields.abnormalDistribution = checkUpdateFields(abnormalDistribution)
  if (distribution) updateFields.distribution = checkUpdateFields(distribution)

  if (abnormalDistributiionUpdatedFlag || distributiionUpdatedFlag) {
    updateFields.lastModifiedTime = admin.firestore.FieldValue.serverTimestamp()
  }
  return updateFields
}

function checkUpdateFields (obj) {
  if (!Object.keys(obj).length) return admin.firestore.FieldValue.delete()
  return obj
}
