/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function (db) {
  const [tenantDocs, userDocs] = await Promise.all([
    db.collection('tenantLimitedInfo').get(),
    db.collection('users').where('role', '==', 1).get()
  ])
  const users = userDocs.docs.map(doc => {
    const {name, email, workfor = {}} = doc.data()
    return {
      uid: doc.id,
      name,
      email,
      workfor: new Map(Object.keys(workfor).map(tKey => [tKey, workfor[tKey]]))
    }
  })

  const currentTime = new Date()
  
  await Promise.all(tenantDocs.docs.map(async doc => {
    let tenantKey = doc.id
    let { name: tenantName } = doc.data()
    const userList = users
      .reduce(
        (userList, {workfor, ...user}) =>
          workfor.has(tenantKey) ? 
            [...userList, {...user, approvalType: workfor.get(tenantKey)}] :
            userList,
        [])
    const updatedRes = await db.doc(`tenants/${tenantKey}/general/users`).set({
      users: userList,
      createTime: currentTime,
      lastModifiedTime: currentTime
    })

    console.log(`The user list (length: ${userList.length}) of tenant(${tenantName}) has been updated at ${updatedRes.writeTime.toDate().toString()}.`)
    return Promise.resolve(tenantKey + '-done')
  }))

  console.log('All-set!')
  return Promise.resolve('all-set')
}
