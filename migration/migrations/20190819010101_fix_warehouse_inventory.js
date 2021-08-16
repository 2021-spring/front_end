module.exports = async function fixWarehouseInventory (db) {
  console.log('start reading data')
  let warehouseKey = 'gwzhvO7mMKeQuwklLLzR'
  let docs = await db.collection('warehouses').doc(warehouseKey).collection('inventory').get()
  let siteTenant2upcMap = {}
  docs.forEach(item => {
    let {upc, quantity, tenantKey, siteKey} = item.data()
    let key = `${siteKey}_${tenantKey}`
    if (!siteTenant2upcMap[key]) {
      siteTenant2upcMap[key] = {[upc]: quantity}
    } else if (!siteTenant2upcMap[key][upc]) {
      siteTenant2upcMap[key][upc] = quantity
    } else {
      siteTenant2upcMap[key][upc] += quantity
    }
  })
  
  await Promise.all(Object.keys(siteTenant2upcMap).map(key => db.collection('warehouses').doc(warehouseKey).collection('inventory').doc(key).set({
    tenantKey: key.split('_')[1],
    siteKey: key.split('_')[0],
    distribution: siteTenant2upcMap[key]
  })))
  await Promise.all(docs.docs.map(doc => doc.ref.delete()))
  console.log('finished! doc size:', docs.size)
}