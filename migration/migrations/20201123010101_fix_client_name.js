module.exports = async function fixClientName (db) {
  const balanceDocs = await db.collection('systemBalance').get()

  let promises = balanceDocs.docs.map(async doc => {
    const clientDoc = await db.collection('warehouses').doc(doc.id).get()
    if (!clientDoc.exists) return
    const {name: clientName} = clientDoc.data()
    const {clientName: oldName} = doc.data()
    if (clientName !== oldName) {
      console.log('tenant: ', {clientName, oldName})
      doc.ref.update({clientName})
    }
  })

  let rtn = await Promise.all(promises)
  return 'success'
}