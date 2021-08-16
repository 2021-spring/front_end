module.exports = async function fixAuth (db, admin) {
  const length = await fixTenants(db)

  console.log('Succeeded.' + length + ' users updated.')
  return Promise.resolve('success.')
}

async function fixTenants (db) {
  const tenantDocs = await db.collection('tenants').get()
  const promises = tenantDocs.docs.map((doc) => {
    let {email, name, users = []} = doc.data()
    if (!users[0] || users[0].email !== email) {
      users.unshift({
        key: doc.id,
        name,
        email,
        roles: ['orgOwner']
      })
      console.log('fix tenant: ', doc.id)
      return doc.ref.update({users})
    }
    return Promise.resolve(false)
  })
  let rtn = await Promise.all(promises)
  return rtn.filter(item => item).length
}
