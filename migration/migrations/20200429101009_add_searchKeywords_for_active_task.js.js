// Define these before run
const END_DATE = ''
const START_DATE = '1/1/2020'
const UPDATE_CHUNKS = 200
// const QUERY_LIMIT = 5000

/**
 * 
 * @param {firebase.firestore.Firestore} db
 */
module.exports = async function addSearchKeywordsForActiveTasks (db) {
  let query = db.collection('tasks/tasks/active')

  if (START_DATE) query = query.where('createTime', '>', new Date(START_DATE))
  if (END_DATE) query = query.where('createTime', '<=', new Date(END_DATE))

  let taskQuerySnapshot = await query.get()
  if (taskQuerySnapshot.size) {
    for (let i = 0; i < taskQuerySnapshot.size; i += UPDATE_CHUNKS) {
      const endIndex = taskQuerySnapshot.size > (i + UPDATE_CHUNKS) ? (i + UPDATE_CHUNKS) : taskQuerySnapshot.size
      const updateDocs = taskQuerySnapshot.docs.slice(i, endIndex)
      await Promise.all(updateDocs.map(async taskDoc => {
        const {productName, userName, offerKey} = taskDoc.data()
        const searchKeywords = [...splitProductName(productName), userName, offerKey]
        return taskDoc.ref.update({ searchKeywords })
      }))
      console.log(`Updated ${(endIndex - i)} tasks.`)
    }
  }
}

function splitProductName (text) {
  let originText = text.toLowerCase()

  text = text.replace(/\n/g, ' ')
  text = text.replace(/,/g, ' ')
  text = text.replace(/\./g, ' ')
  text = text.replace(/，/g, ' ')
  text = text.replace(/。/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()

  let arr = text.toLowerCase().split(' ').filter(item => item !== '' && item !== '-')
  let arr2 = []
  for (let i = 0; i < arr.length - 1; i++) {
    arr2.push(`${arr[i]} ${arr[i + 1]}`)
  }
  arr = [...arr, ...arr2, originText]
  return arr
}