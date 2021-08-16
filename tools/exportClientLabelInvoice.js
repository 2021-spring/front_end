const pathUtil = require('path')
const program = require('commander')
const xlsx = require('xlsx')
const admin = require('firebase-admin')
const getSurchargeName = require('../config/CHARGES')
const { formatDateString } = require('./utils')

function toMoney (moneyNumber) {
  return Math.round((moneyNumber || 0) * 100) / 100
}

let adjustmentHeaders = ['Date', 'Description', 'Amount', 'Note']
const expenseHeaders = [
  'RequestId',
  'note',
  'Type',
  'Created time',
  'Invoice time',
  'Tracking number',
  'Master Tracking number',
  'Service type',
  'From',
  'To',
  'Zone',
  'Weight',
  'BillingWeight',
  'Length',
  'Width',
  'Height',
  'Total amount ($)'
]
// update Header also need update INDEXES
const INDEXES = {
  requestId: 0,
  note: 1,
  status: 2,
  createTime: 3,
  invoiceTime: 4,
  masterTrackingNumber: 6,
  billingWeight: 12,
  length: 13,
  width: 14,
  height: 15,
  totalAmount: 16
}
const expenseHeadersSet = new Set(['Postage'])
const expenseHeadersIndexMap = { postageAmount: 0, PostageAmount: 0 }

/**
 * 
 * @param {admin.firestore.Firestore} db 
 * @param {string} keyString 
 */
async function searchTenant (db, keyString) {
  if (keyString.length === 20) {
    // tenantKey
    return {
      key: keyString
    }
  }
  const clientQuery = await db.collection('systemBalance').where('clientName', '==', keyString).get()

  const [clientDoc = null] = clientQuery.docs

  if (!clientDoc) {
    console.log(`cannot find client (${keyString})`)
    throw Error('not-org')
  }

  return {
    key: clientDoc.id,
    ...clientDoc.data()
  }
}

/**
 * 
 * @param {admin.firestore.Firestore} db 
 * @param {string} dates 
 * @param {string} tenantKey 
 * @returns 
 */
async function labelInvoice2Excel (db, dates, keyString, path = '') {
  const tenant = await searchTenant(db, keyString)

  const [startDateStr, endDateStr] = dates.split(',')
  const startDate = new Date(startDateStr)
  const endDate = new Date(new Date(endDateStr).getTime() + 86400000)

  const [labelQuery, transactionsQuery] = await Promise.all([
    db.collection('labels')
      .where('clientKey', '==', tenant.key)
      .where('createTime', '>=', startDate)
      .where('createTime', '<', endDate)
      .orderBy('createTime', 'desc')
      .get(),
    db.collection('systemTransactions')
      .where('clientKey', '==', tenant.key)
      .where('createTime', '>=', startDate)
      .where('createTime', '<', endDate)
      .orderBy('createTime', 'desc')
      .get()
  ])
  
  const book = await processTransactionsToExcel(transactionsQuery, labelQuery)
  
  const xlsxFilePath = pathUtil.join(
    path,
    `labels-${tenant.clientName || tenant.key}-${startDateStr}-${endDateStr}.xlsx`
  )
  console.log('generate file at ' + xlsxFilePath)

  xlsx.writeFile(book, xlsxFilePath)
  return 'done'
}

function makeContact (contact = {}) {
  const {
    zipCode = '',
    phoneNumber = '',
    city = '',
    address1 = '',
    address2 = '',
    fullName = '',
    state = ''
  } = contact

  return (
    (fullName ? fullName + ', ' : '') +
    (phoneNumber ? 'tel:' + phoneNumber + ', ' : '') +
    (address1 + address2 ? address1 + address2 + ', ' : '') +
    (city ? city + ', ' : '') +
    (state ? state + ' ' : '') +
    zipCode
  )
}

/**
 * 
 * @param {string[][]} labelExpense 
 * @param {string[][]} invoices 
 * @param {string[][]} cancelLabels 
 */
function mergeInvoicesAndCancelToExistedLabel (labelExpense, invoices, cancelLabels) {
  let expenses = []
  labelExpense.forEach(labelRow => {
    const requestId = labelRow[0]
    const expenseRow = [...labelRow]
    const extraRows = []

    let relatedInvoices = [] 
    let newInvoices = []
    invoices.forEach(row => {
      if (row[INDEXES.requestId] === requestId) relatedInvoices.push(row)
      else newInvoices.push(row)
    })
    let cancelLabel
    let cancelLabelIndex = cancelLabels.findIndex(row => row[INDEXES.requestId] === requestId)
    if (cancelLabelIndex >= 0) cancelLabel = cancelLabels.splice(cancelLabelIndex, 1)[0]

    if (cancelLabel) {
      // expenseRow[INDEXES.status] = 'canceled'
      // const money = toMoney(expenseRow[INDEXES.totalAmount] + cancelLabel[INDEXES.totalAmount])
      // expenseRow[INDEXES.invoiceTime] = cancelLabel[INDEXES.invoiceTime]
      // expenseRow[INDEXES.totalAmount] = money
      expenseRow[0] = '[remove]'
    }
    if (relatedInvoices.length) {
      relatedInvoices.forEach(inv => {
        if (expenseRow[INDEXES.invoiceTime]) {
          inv[INDEXES.status] = 'new'
          extraRows.push(inv)
        } else {
          const surcharges = inv.slice(INDEXES.totalAmount + 1)
          const money = toMoney(expenseRow[INDEXES.totalAmount] + inv[INDEXES.totalAmount])
          expenseRow[INDEXES.invoiceTime] = inv[INDEXES.invoiceTime]
          expenseRow[INDEXES.billingWeight] = inv[INDEXES.billingWeight]
          expenseRow[INDEXES.length] = inv[INDEXES.length]
          expenseRow[INDEXES.width] = inv[INDEXES.width]
          expenseRow[INDEXES.height] = inv[INDEXES.height]
          expenseRow[INDEXES.totalAmount] = money
          expenseRow.splice(INDEXES.totalAmount + 1, surcharges.length, ...surcharges)
        }
      })
      invoices = newInvoices
    }
    expenses.push(expenseRow)
    if (extraRows.length) expenses.push(...extraRows)
  })

  return {
    expenses: expenses.filter(expense => expense[0] !== '[remove]'),
    adjustLabels: [
      ...cancelLabels,
      ...invoices
    ]
  }
}

/**
 * 
 * @param {admin.firestore.QuerySnapshot} transactionsQuery 
 * @param {admin.firestore.QuerySnapshot} labelQuery 
 */
function processTransactionsToExcel (transactionsQuery, labelQuery) {
  const summary = [adjustmentHeaders]
  const adjustments = []
  const expense = [
  ]
  const invoices = [
  ]
  const cancelLabels = [
  ]
  for (let i = transactionsQuery.size - 1; i >= 0; i--) {
    const transaction = transactionsQuery.docs[i]
    const {createTime, type, amount = 0, last4 = '', cardType = '', details = [], note = '', operator} = transaction.data()
    const createDate = createTime.toDate()

    switch (type) {
      case 'deposit':
        adjustments.push([
          createDate.toISOString().slice(0, 10),
          'Deposit',
          amount,
          `${cardType} *${last4} `
        ])
        break
      case 'adjust':
        (() => {
          if (details.some(detail => detail.invoiceNumber)) {
            // invoice
            details.forEach(detail => {
              const {
                requestId,
                invoiceDate,
                trackingNumber,
                shipper,
                recipient,
                serviceType,
                actualZone,
                actualHeight,
                actualWeight,
                billingWeight,
                actualLength,
                actualWidth,
                actualAmountDetails = {},
                type: invoiceType = 'extra'
              } = detail
              const currentInvoice = [
                requestId,
                '', // empty note
                'invoice',
                createDate.toISOString().slice(0, 10),
                formatDateString(invoiceDate),
                trackingNumber,
                findMasterTrackingNumber(labelQuery, requestId),
                serviceType,
                makeContact(shipper),
                makeContact(recipient),
                actualZone,
                actualWeight,
                billingWeight,
                actualLength,
                actualWidth,
                actualHeight,
                -amount,
                ...buildCharges(actualAmountDetails, expenseHeadersIndexMap, expenseHeadersSet)
              ]
              
              const previousInvoice = invoices.find(([invReqId]) => invReqId === requestId)

              if (previousInvoice && invoiceType === 'adjust') {
                const previousSurcharges = previousInvoice.slice(INDEXES.totalAmount + 1)
                const currentSurcharges = currentInvoice.slice(INDEXES.totalAmount + 1)
                previousInvoice[INDEXES.totalAmount] = toMoney(previousInvoice[INDEXES.totalAmount] + currentInvoice[INDEXES.totalAmount])
                const loopLength = previousSurcharges.length > currentSurcharges.length ? previousSurcharges.length : currentSurcharges.length
                for (let i = 0; i < loopLength; i++) {
                  previousSurcharges[i] = toMoney((previousSurcharges[i] || 0) + (currentSurcharges[i] || 0)) || ''
                }
                previousInvoice.splice(INDEXES.totalAmount + 1, previousSurcharges.length, ...previousSurcharges)
              } else {
                invoices.push(currentInvoice)
              }
            })
            return 
          }
          if (note.startsWith('Cancel') || note.startsWith('Create label fail')) {
            // cancel
            if (!details.length) {
              // cancel only log ids
              const labelKeys = note.slice(12).split(',').map(s => String(s).trim())
              labelKeys.forEach(key => {
                const {
                  requestId,
                  labelKey,
                  trackingNumber,
                  from,
                  to,
                  serviceType,
                  zone,
                  height,
                  weight,
                  billingWeight,
                  length,
                  width,
                  amountDetails = {},
                  totalAmount: labelTotalAmount = 0
                } = (() => {
                  const labelDoc = labelQuery.docs.find(doc => doc.id === key)
                  if (!labelDoc) return {}
                  let label = labelDoc.data()
                  label.requestId = labelDoc.id
                  return label
                })()
                const isMPSSubPkg = (labelKey || requestId).slice(-4).includes('ml')
                cancelLabels.push([
                  labelKey || requestId,
                  '', // empty note
                  'cancel',
                  createDate.toISOString().slice(0, 10),
                  createDate.toISOString().slice(0, 10),
                  trackingNumber,
                  findMasterTrackingNumber(labelQuery, labelKey || requestId),
                  serviceType,
                  makeContact(from || {}),
                  makeContact(to || {}),
                  zone,
                  weight,
                  billingWeight,
                  length,
                  width,
                  height,
                  isMPSSubPkg ? 0 : -Number(labelTotalAmount),
                  ...buildCharges(isMPSSubPkg ? {} : amountDetails, expenseHeadersIndexMap, expenseHeadersSet)
                ])
              })
            }
            details.forEach(detail => {
              const {
                requestId,
                labelKey,
                trackingNumber,
                from,
                to,
                serviceType,
                zone,
                height,
                weight,
                billingWeight,
                length,
                width,
                amountDetails = {},
                totalAmount: labelTotalAmount = 0
              } = detail
              const isMPSSubPkg = labelKey.slice(-4).includes('ml')
              cancelLabels.push([
                labelKey || requestId,
                '', // empty note
                'cancel',
                createDate.toISOString().slice(0, 10),
                createDate.toISOString().slice(0, 10),
                trackingNumber,
                findMasterTrackingNumber(labelQuery, labelKey || requestId),
                serviceType,
                makeContact(from),
                makeContact(to),
                zone,
                weight,
                billingWeight,
                length,
                width,
                height,
                isMPSSubPkg ? 0 : -Number(labelTotalAmount),
                ...buildCharges(isMPSSubPkg ? {} : amountDetails, expenseHeadersIndexMap, expenseHeadersSet)
              ])
            })
          }
          // do adjust
          if (operator) {
            adjustments.push([
              createDate.toISOString().slice(0, 10),
              'Other adjustment',
              amount,
              note
            ])
          }
        })()
        break
      case 'label':
        // prepay label
        details.forEach(detail => {
          const {orderId, from, to, serviceType, zone, length, width, height, weight, billingWeight, totalAmount: labelTotalAmount, amountDetails = {}, note = ''} = detail
          const [ , reqId ] = orderId.split('-')
          const isMPSSubPkg = reqId.slice(-4).includes('ml')
          expense.push([
            reqId,
            note,
            'new',
            createDate.toISOString().slice(0, 10),
            '',
            findTrackingNumber(labelQuery, reqId),
            findMasterTrackingNumber(labelQuery, reqId),
            serviceType,
            makeContact(from),
            makeContact(to),
            zone,
            weight,
            billingWeight,
            length,
            width,
            height,
            isMPSSubPkg ? 0 : labelTotalAmount,
            ...buildCharges(isMPSSubPkg ? {} : amountDetails, expenseHeadersIndexMap, expenseHeadersSet)
          ])
        })
        break
    } 
  }

  const {adjustLabels, expenses} = mergeInvoicesAndCancelToExistedLabel(expense, invoices, cancelLabels)

  const [lastTransaction] = transactionsQuery.docs
  const firstTransaction = transactionsQuery.docs[transactionsQuery.size - 1]
  const {
    newBalance: firstNewBalance = 0,
    amount: firstAmount = 0,
    totalAmount: firstTotalAmount = 0
  } = firstTransaction.data()
  const {
    newBalance: lastNewBalance = 0
  } = lastTransaction.data()

  const expenseRow = expenses.reduce((sum, row) => { 
    sum[0] < row[INDEXES.createTime] && (sum[0] = row[INDEXES.createTime])
    sum[2] = toMoney(sum[2] - row[INDEXES.totalAmount])
    return sum
  }, ['', 'New freight charges', 0])
  expenseRow[0] || (expenseRow[0] = lastTransaction.createTime.toDate().toISOString().slice(0, 10))

  const adjustLabelRow = adjustLabels.reduce((sum, row) => { 
    sum[0] < row[INDEXES.createTime] && (sum[0] = row[INDEXES.createTime])
    sum[2] = toMoney(sum[2] - row[INDEXES.totalAmount])
    return sum
  }, ['', 'Adjustment freight charges', 0])
  adjustLabelRow[0] || (adjustLabelRow[0] = lastTransaction.createTime.toDate().toISOString().slice(0, 10))

  summary.push(
    [], 
    [
      firstTransaction.createTime.toDate().toISOString().slice(0, 10),
      'Begin balance',
      toMoney(firstNewBalance - firstAmount - firstTotalAmount)
    ], 
    [],
    expenseRow,
    adjustLabelRow,
    ...adjustments,
    [],
    [
      lastTransaction.createTime.toDate().toISOString().slice(0, 10),
      'End balance',
      toMoney(lastNewBalance)
    ]
  )

  // export to excel

  const book = xlsx.utils.book_new()
  const expenseSheet = xlsx.utils.aoa_to_sheet([
    [...expenseHeaders, ...expenseHeadersSet],
    ...expenses,
    [],
    [],
    ...adjustLabels
  ])
  const summarySheet = xlsx.utils.aoa_to_sheet(summary)

  xlsx.utils.book_append_sheet(book, summarySheet, 'Summary')

  xlsx.utils.book_append_sheet(book, expenseSheet, 'Expense detail')

  return book
}

/**
 * 
 * @param {admin.firestore.QuerySnapshot} labelQuery 
 * @param {string} reqId 
 */
function findTrackingNumber (labelQuery, reqId) {
  const label = labelQuery.docs.find(label => label.id === reqId)
  let trackingNumber = ''

  if (label) {
    trackingNumber = label.get('trackingNumber')
  }

  return trackingNumber
}

function findMasterTrackingNumber (labelQuery, reqId) {
  const [masterReqId] = String(reqId || '').split('ml')
  return findTrackingNumber(labelQuery, masterReqId)
}

/**
 *
 * @param {{[key: string]: number}} amountDetails
 * @param {{[key: string]: number}} keyIndexMap
 * @param {Set<string>} headerSet
 */
function buildCharges (amountDetails = {}, keyIndexMap, headerSet) {
  Object.keys(amountDetails).forEach(key => {
    const exportHeaderName = getSurchargeName(key)
    if (!headerSet.has(exportHeaderName)) {
      keyIndexMap[key] = headerSet.size
      headerSet.add(exportHeaderName)
    } else if (keyIndexMap[key] === undefined) {
      const headers = [...headerSet]
      keyIndexMap[key] = headers.findIndex(key => key === exportHeaderName)
    }
  })
  let rtn = Array(headerSet.size).fill('')
  return Object.entries(amountDetails).reduce((arr, [key, value]) => {
    rtn[keyIndexMap[key]] = value
    return rtn
  }, rtn)
}

program
  .option('-e, --env <env>', 'run mode', /^(production-Careful|core|development)$/i, 'development')
  .option('-d, --date <date>', `format: 1990-01-08,2000-03-01`)
  .option('-k, --key <key>', `tenant key or tenant name`)
  .option('-p, --path <path>', 'export path')
  .parse(process.argv)

process.env.NODE_ENV = program.env
let certPath

if (program.env === 'production-Careful') {
  certPath = '../config/cert/prod-cert.json'
} else if (program.env === 'core') {
  certPath = '../config/cert/core-cert.json'
} else {
  certPath = '../config/cert/dev-cert.json'
}

console.log(`==================================================`)
console.log(`==========run on ${program.env}=========`)
console.log(`==================================================`)

let serviceAccount = require(certPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://' + serviceAccount.project_id + '.firebaseio.com'
})

let db = admin.firestore()
const settings = {timestampsInSnapshots: true}
db.settings(settings)

console.log('start transforming... \n\n\n')

labelInvoice2Excel(db, program.date, program.key, program.path)
  .then(() => {
    console.log('transforming complete \n\n\n')
  })
