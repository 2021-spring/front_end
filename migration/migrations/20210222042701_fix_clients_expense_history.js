function toMoney (moneyNumber) {
  return Math.round((moneyNumber || 0) * 100) / 100
}

const months = ['2021-1']
/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 */
module.exports = async function fixExpenseByMonth (db) {
  const clientsDocs = await db.collection('systemBalance').get()

  for await (let clientDoc of clientsDocs.docs) {
    await db.runTransaction(async transaction => {
      let clientTransactionDoc = await transaction.get(clientDoc.ref)

      const {expenseHistory = []} = clientTransactionDoc.data()
      console.log(clientDoc.id, JSON.stringify(expenseHistory))
      let newExpenses = await Promise.all(months.map(async dateKeyStr => {
        const newExpense = {
          dateKeyStr,
          expense: await calExpenseByMonth(db, dateKeyStr, clientDoc.id)
        }
        return newExpense
      }))
      newExpenses.forEach(expense => {
        if (!expense.expense) return // ignore when expense = 0
        let index = expenseHistory.findIndex(exp => exp.dateKeyStr === expense.dateKeyStr)
        if (index >= 0) {
          expenseHistory[index] = expense
        } else {
          expenseHistory.push(expense)
        }
      })

      console.log(clientDoc.id, JSON.stringify(expenseHistory))
    
      transaction.update(clientTransactionDoc.ref, {
        expenseHistory
      })
    })
  }
  
  return 'success'
}

/**
 * 
 * @param {import('firebase-admin').firestore.Firestore} db 
 * @param {string} dateKeyStr
 */
async function calExpenseByMonth (db, dateKeyStr, clientKey) {
  const [currentYear, month] = dateKeyStr.split('-')
  const currentMonth = month.padStart(2, '0')
  const nextMonth = (Number(month) + 1).toString().padStart(2, '0')
  const lastQueryYear = Number(currentYear) + (Number(month) >= 12 ? 1 : 0)
  const startDate = new Date(`${currentYear}-${currentMonth}-01T00:00:00.000Z`)
  const endDate = new Date(`${lastQueryYear}-${nextMonth}-01T00:00:00.000Z`)
  const [firstTransactionQuery, lastTransactionQuery, depositTransactionsQuery] = await Promise.all([
    db.collection('systemTransactions').where('clientKey', '==', clientKey).where('createTime', '>=', startDate).orderBy('createTime', 'asc').limit(1).get(),
    db.collection('systemTransactions').where('clientKey', '==', clientKey).where('createTime', '<', endDate).orderBy('createTime', 'desc').limit(1).get(),
    db.collection('systemTransactions').where('clientKey', '==', clientKey).where('type', '==', 'deposit').where('createTime', '>=', startDate).where('createTime', '<', endDate).orderBy('createTime', 'desc').get()
  ])
  const firstTransaction = firstTransactionQuery.empty ? {} : firstTransactionQuery.docs[0].data()
  const lastTransaction = lastTransactionQuery.empty ? {} : lastTransactionQuery.docs[0].data()
  const {newBalance: firstBalance, type: firstTransactionType, amount: firstTransactionAmount} = firstTransaction
  if (!firstBalance) return 0
  const {newBalance: lastValue} = lastTransaction

  const depositAmount = depositTransactionsQuery.docs.reduce((totalAmount, doc) => {
    const {amount} = doc.data()
    return toMoney(totalAmount + (doc.id === firstTransactionQuery.docs[0].id ? 0 : amount))
  }, 0)

  const firstValue = firstTransactionType !== 'deposit' ? toMoney(firstBalance - firstTransactionAmount) : firstBalance

  return toMoney(firstValue + depositAmount - lastValue)
}
