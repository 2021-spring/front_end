module.exports = async function fixTemplate (db) {
  const tenantDocs = await db.collection('tenants').get()
  const warehouseDocs = await db.collection('warehouses').get()
  let qty = 0
  console.log('update warehouse now')
  await Promise.all(warehouseDocs.docs
    .map(async doc => {
      const collectionRef = db.collection('warehouses').doc(doc.id).collection('templates')
      const templateDocs = await collectionRef.get()
      qty += templateDocs.size
      await Promise.all(templateDocs.docs.map(async templateDoc => collectionRef.doc().set(templateDoc.data())))
      await Promise.all(templateDocs.docs.map(templateDoc => templateDoc.ref.delete()))
      return 'done'
    }))
  console.log('update warehouse done.', qty)
  
  console.log('update tenant now')
  for (const doc of tenantDocs.docs) {
    const collectionRef = db.collection('tenants').doc(doc.id).collection('templates')
    const templateDocs = await collectionRef.get()
    for (const templateDoc of templateDocs.docs) {
      const templateObj = templateDoc.data()
      if (templateDoc.id === templateObj.name) {
        qty += 1
        await collectionRef.doc().set(templateObj)
        await templateDoc.ref.delete()
      }
    }
  }

  console.log('total update: ', qty)
  return 'success'
}
