module.exports = async function removeZeroQuantityUserInventory (db) {
  console.log('start reading user')
  let userDocs = await db.collection('users').where('role', '==', 1).get()
  let userQty0RelatedGroup = await Promise.all(
    userDocs
      .docs
      .map(async userDoc => {
        let userId = userDoc.id
        let [
          userInventoryDocs, 
          reportLostDocs,
          shipmentsDocs
        ] = await Promise.all([
          db.collection('userLimitedInfo')
            .doc(userId).collection('inventory')
            .where('quantity', '==', 0).get(),
          db.collection('reportLost')
            .where('userKey', '==', userId).get(),
          db.collection('shipments')
            .where('userKey', '==', userId).get()
        ])
        return {userInventoryDocs, reportLostDocs, shipmentsDocs}
      })
  )
  let userQty0InventoryRefs = userQty0RelatedGroup.reduce((totalRemoveList, {userInventoryDocs, reportLostDocs, shipmentsDocs}) => {
    let reportLosts = reportLostDocs.docs.map(doc => doc.data())
    let shipments = shipmentsDocs.docs.map(doc => doc.data())
    let removeList = userInventoryDocs.docs.reduce((removeList, doc) => {
      let inventoryRef = doc.ref
      let { productId, tenantKey } = doc.data()
      // check shipment & report
      if (
        reportLosts.find(rl => 
          rl.productId === productId && 
          rl.tenantKey === tenantKey
        ) ||
        shipments.find(shipment => 
          shipments.tenantKey === tenantKey && 
          shipment.products.find(product => product.productId === productId)
        )
      ) {
        return removeList
      }
      removeList.push(inventoryRef)
      return removeList
    }, [])
    return [...totalRemoveList, ...removeList]
  }, [])
  console.log('Got user\'s quantity 0 inventory count: ' + userQty0InventoryRefs.length)
  console.log('Start to delete quantity 0 inventory. ')
  await Promise.all(userQty0InventoryRefs.map(ref => ref.delete()))
  console.log(`Finished! Delete ${userQty0InventoryRefs.length} document(s)`)
}
