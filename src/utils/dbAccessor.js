// suffix "store" indicates opertation again firestore instead of firebase
// suffix "RT" indicates get Realtime updates

import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/firestore'
import 'firebase/compat/functions'
import 'firebase/compat/storage'
import { addNumbers, isDateEqual, getRandomIdByTime } from '../utils/tools'
import pathUtil from 'path'

const dbAccessor = {
  updateFieldsStore: (payload, ...path) => {
    let query = buildStoreQuery(path)
    return runAndLog(query.update(addUpdateDocTimestamp(payload)))
  },
  getNewDocumentKey: (...path) => {
    return buildStoreQuery(path).doc()
  }
}

function getServerTimestamp () {
  return firebase.firestore.FieldValue.serverTimestamp()
}

function deleteField () {
  return firebase.firestore.FieldValue.delete()
}

function fieldValue () {
  return firebase.firestore.FieldValue
}

/**
 * 
 * @param {Array<any} items 
 */
function fieldArrayUnion (items) {
  return firebase.firestore.FieldValue.arrayUnion(...items)
}

function fieldArrayRemove (items) {
  return firebase.firestore.FieldValue.arrayRemove(...items)
}

/** @param {number} n */
function incrementField (n) {
  return firebase.firestore.FieldValue.increment(n)
}

function addUpdateDocTimestamp (obj) {
  obj.lastModifiedTime = getServerTimestamp()
  return obj
}

function addNewDocTimestamp (obj) {
  obj.createTime = getServerTimestamp()
  obj.lastModifiedTime = getServerTimestamp()
  return obj
}

function runAndLog (operation, opName = 'Operation') {
  return operation
    .catch(
      error => {
        console.log(`${opName} failed`)
        process.env.NODE_ENV !== 'production' && console.log(error)
        throw error
      }
    )
}

function callFunction (name, data) {
  return firebase.functions().httpsCallable(name)(data)
}

/**
 * get the defined error message from httpsError
 * @param {httpsError} error 
 * @returns {string}
 */
function getCallFunctionErrMsg (error) {
  const msg = error.message || ''
  const [, ...funcErr] = msg.split('. ')
  return funcErr.join('. ')
}

function sendPasswordResetEmail (emailAddress) {
  return runAndLog(firebase.auth().sendPasswordResetEmail(emailAddress), 'Email sent')
}

function sendEmailVerification (email) {
  const actionCodeSettings = {
    ...process.env.emailCodeSettings,
    url: process.env.emailCodeSettings.url + '?email=' + email

  }
  return runAndLog(firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings), 'Email sent')
}

function finishEmailSignup () {
  if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
    const url = new URL(location.href)
    let email = url.searchParams.get('email')
    if (!email) {
      alert('Email is missing')
      return
    }
    return email
  }
}

function login (username, password) {
  return runAndLog(firebase.auth().signInWithEmailAndPassword(username, password), 'login')
}

function logout () {
  return runAndLog(firebase.auth().signOut(), 'logout')
}

function getNewDocumentKey (...path) {
  return this.buildStoreQuery(path).doc()
}

function buildStoreQuery (path, orderBy, isDescending) {
  let query = path.reduce((previousValue, currentValue, currentIndex) => {
    return currentIndex % 2 === 0 ? previousValue.collection(currentValue) : previousValue.doc(currentValue)
  }, firebase.firestore())
  orderBy && (query = (isDescending === true) ? query.orderBy(orderBy, 'desc') : query.orderBy(orderBy))
  return query
}

function buildStoreQueryPredicates (query, predicates, orderBy, isDescending) {
  if (!predicates) { predicates = [] }
  query = predicates.reduce((previousValue, currentValue) => {
    return previousValue.where(currentValue.field, currentValue.compare, currentValue.value)
  }, query)
  if (Array.isArray(orderBy)) {
    query = orderBy.reduce((acc, item) => {
      let [orderBy, isDesc] = item
      return isDesc ? acc.orderBy(orderBy, 'desc') : acc.orderBy(orderBy)
    }, query)
  } else {
    orderBy && (query = (isDescending === true) ? query.orderBy(orderBy, 'desc') : query.orderBy(orderBy))
  }
  return query
}

function insertStore (payload, ...path) {
  let query = buildStoreQuery(path)
  return runAndLog(query.add(addNewDocTimestamp(payload)), 'insert store data')
}

/**
 *  
 * @param  {string[]} path 
 * @returns {Promise<QuerySnapshot | DocumentSnapshot>}
 */
function queryStore (...path) {
  let query = buildStoreQuery(path)
  return runAndLog(query.get(), 'query firestore')
}

function queryCollectionGroup (predicates, path) {
  let query = buildStoreQueryPredicates(firebase.firestore().collectionGroup(path), predicates)
  return runAndLog(query.get(), 'query collection group')
}

function queryCollectionGroupWithPagination (predicates, path, orderBy, isDescending, startAfter, limit) {
  let query = buildStoreQueryPredicates(firebase.firestore().collectionGroup(path), predicates, orderBy, isDescending)
  startAfter && (query = query.startAfter(startAfter))
  limit && (query = query.limit(limit))
  return runAndLog(query.get(), 'query collection group')
}

/**
 * Build realtime query with predicates
 * @param {(snapshot: QuerySnapshot) => void} successFunc 
 * @param {(error: Error) => void} errorFunc 
 * @param {Array<Predicate>} predicates 
 * @param {string} collection 
 * @param {string} [orderBy]
 * @param {boolean} [isDescending]
 * @returns {() => void} An unsubscribe function that can be called to cancel the snapshot listener.
 */
function queryCollectionGroupRT (successFunc, errorFunc, predicates, collection, orderBy = '', isDescending = false) {
  let query = firebase.firestore().collectionGroup(collection)
  let newQuery = buildStoreQueryPredicates(query, predicates, orderBy, isDescending)
  return newQuery.onSnapshot(successFunc, errorFunc)
}

/**
 * Build realtime query with predicates
 * @param {(snapshot: QuerySnapshot) => void} successFunc 
 * @param {(error: Error) => void} errorFunc 
 * @param {Array<Predicate>} predicates 
 * @param  {...String} path 
 * @returns {() => void} An unsubscribe function that can be called to cancel the snapshot listener.
 */
function queryStoreRT (successFunc, errorFunc, predicates, ...path) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates)
  return query.onSnapshot(successFunc, errorFunc)
}

function queryWithPredicatesStore (predicates, ...path) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates)
  return runAndLog(query.get(), 'query firestore')
}

/**
 * @returns {Promise<QuerySnapshot>}
 */
function queryWithPagination (predicates, path, orderBy, isDescending, startAfter, limit) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates, orderBy, isDescending)
  startAfter && (query = query.startAfter(startAfter))
  limit && (query = query.limit(limit))
  return runAndLog(query.get(), 'query firestore')
}

/**
 * 
 * @param {Array<Predicate>} predicates 
 * @param  {Array<String>} path 
 * @param {Number} limit
 * @returns {Promise<Boolean>}
 */
async function exists (predicates, path, limit = 1) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates).limit(limit)
  let result = await runAndLog(query.get(), 'query firestore')
  if (path.length % 2 === 1) return !!(result.size)
  return result.exists
}

/**
 * 
 * @param {(snapshot: QuerySnapshot) => void} successFunc 
 * @param {(error: Error) => void} errorFunc 
 * @param {Predicate[]} predicates 
 * @param {string[]} path 
 * @param {string} orderBy 
 * @param {boolean} isDescending 
 * @returns {() => void} An unsubscribe function that can be called to cancel the snapshot listener.
 */
function queryRT (successFunc, errorFunc, predicates, path, orderBy, isDescending) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates, orderBy, isDescending)
  return query.onSnapshot(successFunc, errorFunc)
}

/**
 * 
 * @param {Predicate[]} predicates 
 * @param {string[]} path 
 * @param {string} orderBy 
 * @param {boolean} isDescending 
 * @return {Promise<QuerySnapshot>}
 */
function queryWithPredicates (predicates, path, orderBy, isDescending) {
  let query = buildStoreQueryPredicates(buildStoreQuery(path), predicates, orderBy, isDescending)
  return runAndLog(query.get(), 'query firestore')
}

function updateStore (payload, ...path) {
  let query = buildStoreQuery(path)
  return runAndLog(query.set(addNewDocTimestamp(payload)))
}

function updateFieldsStore (payload, ...path) {
  let query = buildStoreQuery(path)
  return runAndLog(query.update(addUpdateDocTimestamp(payload)))
}

/**
 * 
 * @param {string[]} path 
 * @param {string} fieldName 
 * @param {any} newItems 
 */
function updateFieldAddToSetArray (path, fieldName, ...newItems) {
  let query = buildStoreQuery(path)
  let payload = {
    [fieldName]: firebase.firestore.FieldValue.arrayUnion(...newItems)
  }
  return runAndLog(query.update(payload))
}

function updateFieldRemoveFromSetArray (fieldName, removeItem, path) {
  let query = buildStoreQuery(path)
  let payload = {
    [fieldName]: firebase.firestore.FieldValue.arrayRemove(removeItem)
  }
  return runAndLog(query.update(payload))
}

function updateFieldAddToArrayStore (fieldName, newItem, ...path) {
  let query = buildStoreQuery(path)
  let transac = firebase.firestore().runTransaction(transaction => {
    return transaction.get(query).then((sfDoc) => {
      if (!sfDoc.exists) {
        console.error('Trying to add item to array. Document does not exists')
      } else {
        let obj = sfDoc.data()
        obj[fieldName] || (obj[fieldName] = [])
        let newArray = [...obj[fieldName], newItem]
        let payload = { [fieldName]: newArray }
        transaction.update(query, addUpdateDocTimestamp(payload))
      }
    })
  })
  return runAndLog(transac)
}

function updateFieldRemoveOneFromArrayStore (fieldName, predicate, ...path) {
  let query = buildStoreQuery(path)
  let transac = firebase.firestore().runTransaction(transaction => {
    return transaction.get(query).then((sfDoc) => {
      if (!sfDoc.exists) {
        console.error('Trying to add item to array. Document does not exists')
      } else {
        let obj = sfDoc.data()
        let theArray = obj[fieldName]
        let { field, value } = predicate
        let index = theArray.findIndex(item => {
          if (value instanceof Date) {
            return item.createTime && (isDateEqual(value, item.createTime.toDate && item.createTime.toDate()) || isDateEqual(value, new Date(item.createTime)))
          } else {
            // only work for primitive type, can enhance later
            if (field) {
              return item[field] === value
            } else {
              return item === value
            }
          }
        })
        if (index >= 0) {
          theArray.splice(index, 1)
        }
        let payload = { [fieldName]: theArray }
        transaction.update(query, addUpdateDocTimestamp(payload))
      }
    })
  })
  return runAndLog(transac)
}

function removeStore (...path) {
  let query = buildStoreQuery(path)
  return runAndLog(query.delete())
}

function removeTransactionStore (path) {
  let query = buildStoreQuery(path)
  let transac = firebase.firestore()
    .runTransaction(transaction => {
      return transaction.get(query).then((sfDoc) => {
        if (!sfDoc.exists) {
          throw Error(`Document doesn't exist`)
        }
        transaction.delete(query)
      })
    })
  return runAndLog(transac)
}

// caller can pass in a validation function. throw validation-failed error if failed. And can retrieve the current value from error.currentValue
async function increaseValueInTransactionStore (field, increment, path, validationFunc = (docData) => true, createIfValueDocMissing = true) {
  let query = buildStoreQuery(path)
  let transac = firebase.firestore()
    .runTransaction(transaction => {
      return transaction.get(query).then((sfDoc) => {
        let newObj = {}
        let negativeError = new Error('validation-failed')
        if (!sfDoc.exists) {
          console.log('Document does not exist, create one now')
          if (createIfValueDocMissing) {
            if (!validationFunc(increment)) {
              negativeError.currentValue = 0
              throw negativeError
            }
            newObj[field] = increment
            transaction.set(query, addNewDocTimestamp(newObj))
          } else {
            throw Error('skip')
          }
        } else {
          let oldValue = sfDoc.data()[field] || 0
          let newValue = addNumbers(oldValue, increment)
          if (!validationFunc(sfDoc.data())) {
            negativeError.currentValue = oldValue
            throw negativeError
          }
          newObj[field] = newValue
          transaction.update(query, addUpdateDocTimestamp(newObj))
        }
        return newObj[field]
      })
    })
    .catch(error => {
      if (error.message === 'skip') return Promise.resolve('finish')
      console.error(error.message)
      throw error
    })
  return runAndLog(transac)
}

// TODO: change allowNegative to a validation function like the one right above
// valuePath: the array that specify the document that the field lives in
// insertPath: the collection that the new doc lives in
function increaseValueAndInsertDataInTransactionStore (field, increment, valuePath, newDoc, insertPath, allowNegative = true) {
  let valueDocRef = buildStoreQuery(valuePath)
  let newDocRef = buildStoreQuery(insertPath).doc()
  let transac = firebase.firestore().runTransaction(transaction => {
    return transaction.get(valueDocRef).then((sfDoc) => {
      let newObj = {}
      if (!sfDoc.exists) {
        console.log('Document does not exist, create one now')
        newObj[field] = increment
        if (!allowNegative && newObj[field] < 0) {
          throw new Error('No enough left, please specify a smaller number')
        }
        transaction.set(valueDocRef, addNewDocTimestamp(newObj))
      } else {
        let oldValue = sfDoc.data()[field] || 0
        let newValue = addNumbers(oldValue, increment)
        newObj[field] = newValue
        if (!allowNegative && newObj[field] < 0) {
          throw new Error('No enough left, please specify a smaller number')
        }
        transaction.update(valueDocRef, addUpdateDocTimestamp(newObj))
      }
      transaction.set(newDocRef, addNewDocTimestamp(newDoc))

      return newObj[field]
    })
  })
  return runAndLog(transac)
}

// valuePath: the array that specify the document that the field lives in
// insertPath: the collection that the new doc lives in
// rejectIfDocMissing: true will reject the promise when the document containing the increasing value is missing.
async function increaseValueAndDeleteDataInTransactionStore (field, increment, valuePath, deletePath, allowNegative = true, rejectIfValueDocMissing = false, createIfValueDocMissing = false) {
  let valueDocRef = buildStoreQuery(valuePath)
  let deleteDocRef = buildStoreQuery(deletePath)
  let transac = firebase.firestore()
    .runTransaction(transaction => {
      return transaction.get(valueDocRef).then((sfDoc) => {
        let newObj = {}
        if (!sfDoc.exists) {
          if (rejectIfValueDocMissing) return Promise.reject(Error('increase-field-missing'))
          if (createIfValueDocMissing) {
            newObj[field] = increment
            if (!allowNegative && newObj[field] < 0) {
              return Promise.reject(Error('No enough left, please specify a smaller number'))
            }
            transaction.set(valueDocRef, addNewDocTimestamp(newObj))
          } else {
            return Promise.reject(Error('go-delete'))
          }
        } else {
          let oldValue = sfDoc.data()[field] || 0
          let newValue = addNumbers(oldValue, increment)
          newObj[field] = newValue
          if (!allowNegative && newObj[field] < 0) {
            return Promise.reject(Error('No enough left, please specify a smaller number'))
          }
          transaction.update(valueDocRef, addUpdateDocTimestamp(newObj))
        }
        transaction.delete(deleteDocRef)

        return newObj[field]
      })
    })
    .catch(error => {
      if (error.message === 'go-delete') {
        deleteDocRef.delete()
      } else {
        Promise.reject(error)
      }
    })

  return runAndLog(transac)
}

function runInTransactionStore (func) {
  let transac = firebase.firestore().runTransaction(transaction => {
    return func(transaction)
  })
  return runAndLog(transac)
}

function runInBatch (func) {
  let batch = firebase.firestore().batch()
  func(batch)
  return runAndLog(batch.commit())
}

function addArrayItemInTransactionStore (field, item, ...path) {
  let query = buildStoreQuery(path)
  let transac = firebase.firestore().runTransaction(transaction => {
    return transaction.get(query).then((sfDoc) => {
      if (!sfDoc.exists) {
        console.log('Document does not exist')
      } else {
        let oldValue = sfDoc.data()[field] || []
        oldValue.push(item)
        let newObj = {}
        newObj[field] = oldValue
        transaction.update(query, addUpdateDocTimestamp(newObj))
      }
    })
  })
  return runAndLog(transac)
}

function removeAndInsertBatchStore (pathToRemove, item, pathToInsert) {
  let batch = firebase.firestore().batch()
  let removeQuery = buildStoreQuery(pathToRemove)
  let insertQuery = pathToInsert.length % 2 === 0 ? buildStoreQuery(pathToInsert) : buildStoreQuery(pathToInsert).doc()
  batch.set(insertQuery, addNewDocTimestamp(item))
  batch.delete(removeQuery)
  return runAndLog(batch.commit())
}

function removeAndInsertTransaction (pathToRemove, item, pathToInsert) {
  let removeQuery = buildStoreQuery(pathToRemove)
  let insertQuery = buildStoreQuery(pathToInsert).doc()
  let transac = firebase.firestore().runTransaction(transaction => {
    return transaction.get(removeQuery).then(removeDoc => {
      if (!removeDoc.exists) {
        console.log('Document does not exist')
      } else {
        transaction.set(insertQuery, addNewDocTimestamp(item))
        transaction.delete(removeDoc.ref)
      }
    })
  })
  return runAndLog(transac)
}

function uploadFile (file, targetFolder, newFileName) {
  let fileName = newFileName || file.name
  let fileElements = fileName.split('.')
  let fileExt = fileElements.pop()
  let firebaseFileName = `${fileElements.join('.')}_${getRandomIdByTime(3)}.${fileExt}`
  let curTime = new Date()
  let metadata = {
    name: fileName,
    type: file.type,
    fullPath: pathUtil.join(`${curTime.getFullYear()}`, `${curTime.getMonth()}`, targetFolder, firebaseFileName)
  }
  let fileRef = firebase.storage().ref().child(metadata.fullPath)
  let task = fileRef.put(file)
  return { task, file, metadata }
}

function updateFileMetadata (filename, data) {
  let fileRef = firebase.storage().ref().child(filename)
  return fileRef.updateMetadata({ customMetadata: data })
}

function getFileMetadata (filename) {
  return firebase.storage().ref().child(filename).getMetadata()
}

function removeFile (filename) {
  let fileRef = firebase.storage().ref().child(filename)
  return fileRef.delete()
}

function downloadFile (filepath, filename = 'lable.zip') {
  console.log('start download file now: ', filepath)
  let fileRef = firebase.storage().ref().child(filepath)
  return fileRef.getDownloadURL()
    .then(url => new Promise((resolve, reject) => {
      let request = new XMLHttpRequest()
      request.responseType = 'blob'
      request.onload = function (event) {
        // Only handle status code 200
        if (request.status === 200) {
          // The actual download
          var blob = new Blob([request.response], { type: 'application/zip' })
          var link = document.createElement('a')
          link.href = window.URL.createObjectURL(blob)
          link.download = filename

          document.body.appendChild(link)

          link.click()

          document.body.removeChild(link)
          
          return resolve()
        }
      }
      request.open('GET', url)
      request.send()
    }))
    .catch(error => {
      console.error('download file failed: ', error)
    })
}

function getFileUrl (filepath) {
  return firebase.storage().ref().child(filepath).getDownloadURL()
}

async function getFileBlob (URI) {
  const url = await firebase.storage().refFromURL(URI).getDownloadURL()

  let rtnBlob = await new Promise((resolve, reject) => {
    let request = new XMLHttpRequest()
    request.open('get', url, true)
    request.responseType = 'blob'
    request.onload = () => {
      resolve(request.response)
    }
    request.send()
  })

  return rtnBlob
}

export {
  login, logout, getNewDocumentKey, buildStoreQuery, buildStoreQueryPredicates,
  insertStore, queryStore, queryWithPredicatesStore, queryWithPredicates, updateStore, updateFieldAddToArrayStore, updateFieldRemoveOneFromArrayStore,
  removeStore, increaseValueInTransactionStore, increaseValueAndInsertDataInTransactionStore, increaseValueAndDeleteDataInTransactionStore,
  runInTransactionStore, updateFieldsStore, addArrayItemInTransactionStore, queryStoreRT, queryRT, callFunction, getCallFunctionErrMsg, removeAndInsertBatchStore, removeAndInsertTransaction,
  uploadFile, updateFileMetadata, getFileMetadata, removeFile, downloadFile, sendPasswordResetEmail, sendEmailVerification, finishEmailSignup, 
  queryWithPagination, removeTransactionStore, addNewDocTimestamp, addUpdateDocTimestamp, getServerTimestamp, updateFieldAddToSetArray,
  updateFieldRemoveFromSetArray, dbAccessor, queryCollectionGroup, queryCollectionGroupRT, runInBatch, deleteField, getFileUrl, incrementField, exists, queryCollectionGroupWithPagination,
  fieldArrayUnion, fieldArrayRemove, fieldValue, getFileBlob
}
