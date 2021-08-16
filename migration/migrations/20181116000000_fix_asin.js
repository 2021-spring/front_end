module.exports = function updateAsin (db) {
  return db.collection('tenants').get()
    .then(docs => {
      let tenantKeys = []
      let count = 0
      docs.forEach(doc => {
        tenantKeys.push(doc.id)
      })
      let promises = tenantKeys.map(key => {
        return db.collection('tenants').doc(key).collection('inventory').get()
          .then(pkgDocs => {
            return Promise.all(pkgDocs.docs.map(pkgDoc => {
              let pkg = {
                pkgId: pkgDoc.id,
                pkgData: pkgDoc.data()
              }
              if (pkg.pkgData.asin && typeof pkg.pkgData.asin === 'string') {
                console.log('update asin: ', pkg.pkgData.asin)
                pkg.pkgData.asin = [pkg.pkgData.asin]
                count++
                return db.collection('tenants').doc(key).collection('inventory').doc(pkg.pkgId).update({asin: pkg.pkgData.asin})
              }
            }))
          })
      })

      return Promise.all(promises)
        .then(() => {
          console.log('Total items change: ' + count)
        })
    })
}
