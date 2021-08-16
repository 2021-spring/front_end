const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const clientKey = 'omljduF4vU7lezgC9XIf'
const startDate = new Date('2021-03-01T00:00:00.000Z')
const endDate = new Date('2021-03-23T00:00:00.000Z')
/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function buildCancelLabelTransactionDetail (db) {
  /** 
   * @param {import('firebase-admin').firestore.QuerySnapshot} labelsQuery
   * @returns {{
   *  ref: import('firebase-admin').firestore.DocumentReference
   *  details: object[]
   * }[]}
   */
  async function makeTransactionDetails (labelsQuery) {
    let promise = await Promise.all(labelsQuery.docs.map(async labelDoc => {
      if (labelDoc.id.slice(-4).includes('ml')) return 
      let transactionsQuery = await db.collection('systemTransactions')
        .where('keywords', 'array-contains', labelDoc.id)
        .get()

      let details = []
      let cancelTransaction

      transactionsQuery.forEach(doc => {
        const {keywords = [], note = '', details: transactionDetails = [], type} = doc.data()
        if (type === 'label') {
          details = transactionDetails.filter(detail => (detail.labelKey || '').includes(labelDoc.id))
        }
        if (keywords.includes('adjust') && note.startsWith('Cancel') && !transactionDetails) {
          cancelTransaction = {
            ref: doc.ref
          }
        }
      })
      if (cancelTransaction) cancelTransaction = {...cancelTransaction, details}
      return cancelTransaction
    }))
    return promise.filter(obj => obj)
  }

  const labelsQuery = await db.collection('labels')
    .where('status', '==', 'canceled')
    .where('clientKey', '==', clientKey)
    .where('createTime', '>', startDate)
    .where('createTime', '<=', endDate)
    .get()
  
  const updatedTransactions = await makeTransactionDetails(labelsQuery) 
  console.log(`Find ${updatedTransactions.length} transactions to updated`)
  rl.question('Do you want show the updated details (y/N)', answerDisplay => {
    if (answerDisplay.toLowerCase() === 'y') {
      console.log('Details Are:')
      console.log(JSON.stringify(updatedTransactions.map(t => t.details)))
    }
    rl.question('Do you want to update all cancel details (y/N)', async answer => {
      if (answer.toLowerCase() === 'y') {
        await Promise.all(updatedTransactions.map(({ref, details}) => ref && ref.update({details})))
        console.log(`${updatedTransactions.length} transactions has been updated!`)
      }
      rl.close()
    })
  })
}
