module.exports = function updateUserVisible (db) {
  let count = 0
  return db.runTransaction(trans => {
    let activeRef = db.collection('offers').doc('offers').collection('active')
    let archivesRef = db.collection('offers').doc('offers').collection('archives')
    
    return Promise.all([trans.get(activeRef), trans.get(archivesRef)])
      .then(docArray => {
        // Update actives
        docArray[0].docs.map(doc => {
          let oldUserVisible = doc.data().userVisible
          if (oldUserVisible && !Array.isArray(oldUserVisible)) {
            let newUserVisible = Object.keys(oldUserVisible)
            count++
            trans.update(activeRef.doc(doc.id), {userVisible: newUserVisible})
          }
        })
        // Update archives
        docArray[1].docs.forEach(doc => {
          let oldUserVisible = doc.data().userVisible
          if (oldUserVisible && !Array.isArray(oldUserVisible)) {
            let newUserVisible = Object.keys(oldUserVisible)
            count++
            trans.update(archivesRef.doc(doc.id), {userVisible: newUserVisible})
          }
        })
      })
  })
    .then(() => {
      console.log(`userVisible update success! Updated ${count} items.`)
    })
}