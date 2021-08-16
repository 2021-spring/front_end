import * as dbAccessor from '@/utils/dbAccessor'
import { convertTimestampToDateInObj, deepEqual, cloneDeep } from '@/utils/tools'
import {store} from '@/store'

/**
 * @typedef {firebase.firestore.QuerySnapshot} QuerySnapshot
 * @typedef {firebase.firestore.DocumentSnapshot} Doc
 * @typedef {firebase.firestore.DocumentData} DocData
 * @typedef {firebase.firestore.DocumentReference} DocRef
 * @typedef {dbAccessor.Predicate} Predicate
 * 
 * @typedef {T extends ViteModel} SubModel
 */

/**
 * @abstract
 */
export class Model {
  /** @override */
  static fields = () => ({})
  
  /** @override */
  static baseFields = () => ({})
  
  constructor (data) {
    const schema = {
      ...this.constructor.fields(),
      ...this.constructor.baseFields()
    }
    // save all data
    Object.keys(data).forEach(key => {
      if (typeof value !== 'function') {
        this[key] = data[key]
      }      
    })
    // init schema data
    Object.keys(schema).forEach(key => {
      let keyValue = schema[key](data[key])
      keyValue !== undefined && (this[key] = keyValue)
    })
  }
  static string (init, prefix = (value) => value) {
    if (typeof init !== 'string' && init !== undefined) throw Error('initial-value-type-error')
    
    return (value) => {
      value = prefix(value)
      if (value === undefined || value === null) {
        return init
      }
      if (typeof value === 'string') {
        return value
      }
      return value + ''
    }
  }
  static boolean (init, prefix = (value) => value) {
    if (typeof init !== 'boolean' && init !== undefined) throw Error('initial-value-type-error')
    
    return (value) => {
      value = prefix(value)
      if (value === undefined || value === null) {
        return init
      }
      if (typeof value === 'boolean') {
        return value
      }
      if (typeof value === 'string') {
        if (value.length === 0) {
          return false
        }
        let int = parseInt(value, 0)
        return isNaN(int) ? true : !!int
      }
      if (typeof value === 'number') {
        return !!value
      }
      return false
    }
  }
  static number (init, prefix = (value) => value) {
    if (typeof init !== 'number' && init !== undefined) throw Error('initial-value-type-error')
    
    return (value) => {
      value = prefix(value)
      if (value === undefined || value === null) {
        return init
      }
      if (typeof value === 'number') {
        return value
      }
      if (typeof value === 'string') {
        return parseFloat(value)
      }
      if (typeof value === 'boolean') {
        return value ? 1 : 0
      }
      return 0
    }
  }
  static attr (init, prefix = (value) => value) {
    return (value) => {
      value = prefix(value)
      value = (value === undefined || value === null) ? init : value
      // Default Value might be a function (taking no parameter)
      if (typeof value === 'function') {
        return value()
      }
      return value
    }
  }
  static isRequired (fieldName) {
    return (value) => {
      if (value === undefined || value === null) throw Error(`model-${fieldName}-field-missing`)
      return value
    }
  }
}

export default class ViteModel extends Model {
  static _db = dbAccessor
  static _basePathTemplate = '/'

  /** @private */
  static baseFields () {
    return {
      createTime: this.attr(),
      lastModifiedTime: this.attr()
    }
  }

  /** @override */
  static fields () {
    return {}
  }

  get _vueGetters () {
    return store.getters
  }

  get _db () {
    return ViteModel._db
  }

  _snapshot = {} 
  static newDoc (data) {
    return new this(data, true)
  }
  /**
   * @constructor
   * @param {*} data 
   */
  constructor (data, isNewDoc = false) {
    super(data)
    this._key = data._key
    if (!isNewDoc) this._takeSnapshot()
  }

  static getServerTime () {
    return ViteModel._db.callFunction('getServerTime', {})
  }
  
  static _getBase () {
    return this._basePathTemplate.split('/')
  }

  /**
   * 
   * @param {Doc} doc 
   * @returns {{ _key: string} & DocData}}
   * @protected
   */
  static _extractDoc (doc) {
    let docData = convertTimestampToDateInObj(doc.data())
    return {...docData, _key: doc.id}
  }

  static _getUpdateModelData (payload) {
    let updateData = {}
    this.fields().forEach(key => {
      if (payload[key] !== undefined) {
        updateData[key] = payload[key]
      }
    })
    return updateData
  }

  static _buildRef (path) {
    return ViteModel._db.buildStoreQuery(path)
  }

  static updateFileMetaData (path, payload) {
    return dbAccessor.updateFileMetadata(path, payload)
  }

  /** @param {String[]} path */
  static async get (...path) {
    let doc = await this._db.queryStore(...path)
    if (doc.exists) {
      return new this(this._extractDoc(doc), path[1])
    } else {
      throw Error('doc-not-exist')
    }
  }

  static async getModelsWithPredicates (path, predicates, orderBy, isDescending) {
    let docs = await this._db.queryWithPredicates(predicates, path, orderBy, isDescending)
    return docs.docs.map(doc => new this(this._extractDoc(doc.data())))
  }

  static async getT (transaction, ref, isReturnModel = false) {
    if (!ref) throw Error('undefined-ref')
    const doc = this._extractDoc(await transaction.get(ref))
    return isReturnModel ? new this(doc) : doc
  }

  static updateFieldsT (transaction, ref, payload) {
    if (!transaction || !ref) throw Error('update-transaction-error')
    const fieldsToUpdate = this._getUpdateModelData(payload)
    return transaction.update(ref, fieldsToUpdate)
  }

  static getRT (cbFunc, path, predicates, orderBy, isDescending, isReturnModel = false) {
    const successFunc = (docs) => {
      let data = docs.docs.map(doc => isReturnModel ? new this(this._extractDoc(doc)) : this._extractDoc(doc))
      cbFunc(data)
    }
    const errorFunc = (error) => {
      console.error(error)
    }
    const unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, path, orderBy, isDescending)
    return unsubscribe
  }

  /**
   * @protected
   * @param {(data: ViteModel[]) => void} cbFunc 
   * @param {string} collection 
   * @param {Predicate[]} [predicates] 
   * @param {string} [orderBy] 
   * @param {boolean} [isDescending] 
   * @param {Function} [_ModelConstructor]
   */
  static groupRT (cbFunc, collection, predicates, orderBy = '', isDescending = '', _ModelConstructor) {
    /** @param {QuerySnapshot} querySnapshot */
    const successFunc = (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => 
        typeof _ModelConstructor === 'function' ? 
          _ModelConstructor(doc) : 
          (this._extractDoc(doc))
      )
      return cbFunc(data)
    }

    /** @param {(error: Error) => void} */
    const errorFunc = (error) => { console.log(error) }

    return this._db.queryCollectionGroupRT(successFunc, errorFunc, predicates, collection, orderBy, isDescending)
  }

  /**
   * 
   * @param {(transaction: firebase.firestore.Transaction) => void} func 
   */
  static startTransaction (func) {
    return ViteModel._db.runInTransactionStore(func)
  }

  static removeFromSetArray (obj, path) {
    let promises = Object.keys(obj).map(key => dbAccessor.updateFieldRemoveFromSetArray(key, obj[key], path))
    return Promise.all(promises)
  }

  static isValid (payload) {
    
  }

  static query (predicates) {

  }
  static updateFields () {

  }

  /**
   * 
   * @param {boolean} isOnlyGetUpdatedFields 
   * @public
   */
  getData (isOnlyGetUpdatedFields = false) {
    let data = {}
    let dataFields = {
      ...this.constructor.fields(),
      ...this.constructor.baseFields()
    }
    Object.keys(dataFields).forEach(key => {
      if (this[key] !== undefined && (
        !isOnlyGetUpdatedFields || (this[key] !== Object(this[key]) ? this[key] !== this._snapshot[key] : !deepEqual(this[key], this._snapshot[key]))
      )) {
        data[key] = this[key] 
      }
    })
    return data
  }

  /** @private */
  _takeSnapshot () {
    this._snapshot = cloneDeep(this.getData()) 
  }

  /**
   * @todo incrementFields, deleteFields
   */
  getUpdatedFieldsData () {
    return this.getData(true)
  }

  getKey () {
    return this._key
  }

  // it is important to update _snapshot of instance
  async update () {
    if (!this._fullPath) throw Error('update-error')
    const data = this._db.addUpdateDocTimestamp(this.getData())
    await ViteModel._db.updateFieldsStore(data, ...this._fullPath)
    this._takeSnapshot()
  }

  // it is important to update _snapshot of instance
  insert () {
    this._takeSnapshot()
    if (this._key) {
      return ViteModel._db.updateStore(this._snapshot, ...this._basePath, this._key)
    }
    return ViteModel._db.insertStore(this._db.addNewDocTimestamp(this._snapshot), ...this._basePath)
  }

  updateKey (key) {
    this._key = key
    this._fullPath = [...this._basePath, key]
  }
  
  delete () {
    if (!this._fullPath) throw Error('undefined-full-path')
    return ViteModel._db.removeStore(...this._fullPath)
  }

  insertT (transaction, customPath) {
    this._takeSnapshot()
    let newRef
    if (customPath) {
      newRef = this.constructor._buildRef(customPath)
    } else {
      const path = this._basePath
      if (!path) throw Error('insertT-error')
      newRef = this.constructor._buildRef(path).doc()
    }
    transaction.set(newRef, this._db.addNewDocTimestamp(this._snapshot))
    return newRef
  }
  insertOrUpdateT (transaction, customPath) {
    this._takeSnapshot()
    let newRef
    if (customPath) {
      newRef = this.constructor._buildRef(customPath)
    } else {
      const path = this._basePath
      if (!path) throw Error('insertT-error')
      newRef = this._key ? this.constructor._buildRef(path).doc(this._key) : this.constructor._buildRef(path).doc()
    }
    transaction.set(newRef, this._db.addNewDocTimestamp(this._snapshot))
    return newRef
  }
  updateT (transaction) {
    if (!this._fullPath) throw Error('updateT-error')
    const ref = this.constructor._buildRef(this._fullPath)
    const data = this._db.addUpdateDocTimestamp(this.getUpdatedFieldsData())
    transaction.update(ref, data)
    this._takeSnapshot()
    return ref
  }
  deleteT (transaction) {
    if (!this._fullPath) throw Error('undefined-full-path')
    const ref = this.constructor._buildRef(this._fullPath)
    transaction.delete(ref)
    return ref
  }
}
