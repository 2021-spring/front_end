module.exports = async function initAuth (db, admin) {
  console.time('time spent')
  const userAuths = await initiateUsers(db)
  const tenantAuths = await initiateTenants(db)
  const warehouseAuths = await initiateWarehouses(db)

  let auths = [...userAuths, ...tenantAuths, ...warehouseAuths]
  let length = auths.length

  await executionQueue(auths, admin)

  console.timeEnd('time spent')
  console.log('Succeeded.' + length + ' users updated.')
  return Promise.resolve('success.')
}

async function grantUserRole (admin, data) {
  let {email, roles} = data

  if (!email) throw new Error('missing-email')
  if (!roles) throw new Error('missing-roles')

  const user = await admin.auth().getUserByEmail(email)
  await admin.auth().setCustomUserClaims(user.uid, {roles})
  await admin.auth().revokeRefreshTokens(user.uid)
  return 'success'
}

async function initiateUsers (db) {
  let grantUserRoleArr = []
  const userDocs = await db.collection('users').where('role', '==', 1).get()
  const promises = userDocs.docs.map(doc => {
    const {email, warehouses = []} = doc.data()
    if (!warehouses.length) {
      grantUserRoleArr.push({email, roles: ['user']})
    }
  })
  await Promise.all(promises)
  return grantUserRoleArr
}

async function initiateTenants (db) {
  let grantUserRoleArr = []
  const tenantDocs = await db.collection('tenants').get()
  const promises = tenantDocs.docs.map((doc) => {
    const {email, name} = doc.data()
    grantUserRoleArr.push({email, roles: ['orgOwner']})
    return doc.ref.update({users: [{
      key: doc.id,
      name,
      email,
      roles: ['orgOwner']
    }]})
  })
  await Promise.all(promises)
  return grantUserRoleArr
}

async function initiateWarehouses (db) {
  let grantUserRoleArr = []
  const warehouseDocs = await db.collection('warehouses').where('limitOrgNum', '>', 0).get()
  const promises = warehouseDocs.docs.reduce((acc, doc) => {
    const {users, name} = doc.data()
    const userPromises = users.map(user => {
      if (user.name === name) {
        grantUserRoleArr.push({email: user.email, roles: ['warehouseOwner']})
      }
      grantUserRoleArr.push({email: user.email, roles: []})
      return db.collection('users').where('email', '==', user.email).get()
    })
    return [...acc, ...userPromises]
  }, [])
  const userDocsArr = await Promise.all(promises)

  const emailToKeyMap = new Map(userDocsArr.map(docs => {
    let doc = docs.docs[0]
    return [doc.data().email, doc.id]
  }))

  const updatePromises = warehouseDocs.docs.map((doc) => {
    const {users, name} = doc.data()
    users.forEach(user => {
      user.key = emailToKeyMap.get(user.email) || ''
      user.roles = user.name === name ? ['warehouseOwner'] : []
    })
    return doc.ref.update({users})
  })
  await Promise.all(updatePromises)
  return grantUserRoleArr
}

async function executionQueue (auths, context) {
  if (auths.length > 0) {
    const auth = auths.pop()
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        grantUserRole(context, auth)
          .then(() => {
            resolve('success')
          })
          .catch((err) => {
            reject(err)
          })
      }, 150)
    })
    await executionQueue(auths, context)
  }
}
