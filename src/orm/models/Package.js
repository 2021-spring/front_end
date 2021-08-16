import ViteModel from './ViteModel'

/**
 * @typedef {import('@/utils/dbAccessor').Predicate} Predicate
 */

/**
 * @class
 * @extends ViteModel
; */
export default class Package extends ViteModel {
  static fields () {
    return {
      attachments: this.attr([]),
      abnormalQty: this.number(0),
      addedToInventoryTime: this.attr({}),
      comments: this.attr([]),
      favorites: this.attr([]),
      isAbnormal: this.boolean(false),
      isAddedToInventory: this.boolean(false),
      isConfirmed: this.boolean(false),
      confirmedTime: this.attr(),
      note: this.string(''),
      normalQty: this.number(0),
      organizationKey: this.string(''),
      quantity: this.number(0, this.isRequired('quantity')),
      resolveNote: this.string(''),
      returnQty: this.number(0),
      siteName: this.string(''),
      size: this.string(''),
      trackings: this.attr([]),
      unitFee: this.number(0),
      upc: this.string(''),
      warehouseSite: this.string(''),
      workerKey: this.string(''),
      workerName: this.string('')
    }
  }

  static _basePathTemplate = 'warehouses/{warehouseKey}/packages'

  constructor (data, warehouseKey, uid = '') {
    super(data)
    if (!warehouseKey) throw Error('warehouseKey-missing')
    this.warehouseKey = warehouseKey
    if (uid) this[`lastRead_${uid}`] = data[`lastRead_${uid}`] || ''
    if (warehouseKey) {
      this._basePath = this.constructor._basePathTemplate.split('/')
      this._basePath[1] = warehouseKey
      if (data._key) {
        this._fullPath = [...this._basePath, data._key]
      }
    }
  }

  static async getT (transaction, warehouseKey, packageId) {
    if (!warehouseKey || !packageId) throw Error('undefined-full-path')
    const ref = this._getRef(warehouseKey, packageId)
    let rawData = await super.getT(transaction, ref)
    return new Package(rawData, warehouseKey)
  }

  /**
   * @override
   * 
   */
  static getRT (cbFunc, warehouseKey, uid, path, predicates, orderBy, isDescending) {
    const successFunc = (packages) => {
      let data = packages.map(packageItem => new this(packageItem, warehouseKey, uid))
      cbFunc(data)
    }
    return super.getRT(successFunc, path, predicates, orderBy, isDescending)
  }

  /**
   * 
   * @param {(packages: Package[]) => void} cbFunc 
   * @param {string} warehouseKey 
   * @param {string} uid 
   * @param {string} tenantKey 
   * @returns {() => void} Unsubscribe handle func
   */
  static getAbnormalPkgsRTByWarehouseKey (cbFunc, warehouseKey, uid, tenantKey = '') {
    const predicates = [{field: 'isAbnormal', compare: '==', value: true}]
    if (tenantKey) predicates.push({field: 'organizationKey', compare: '==', value: tenantKey})
    const path = ['warehouses', warehouseKey, 'packages']

    return this.getRT(cbFunc, warehouseKey, uid, path, predicates, 'createTime', false)
  }

  /**
   * 
   * @param {(data: Packages) => void} cbFunc 
   * @param {{
   *  warehouseKey?: string,
   *  uid?: string,
   *  predicates?: Predicate[],
   *  orderBy?: string,
   *  isDescending?: boolean
   * }} options 
   */
  static _getPackagesGroupRT (cbFunc, options) {
    const { 
      uid = '',
      predicates = [],
      orderBy = '',
      isDescending = false
    } = options
    const constructFunc = (uid = '') => {
      return (doc) => new Package(Package._extractDoc(doc), doc.ref.path.split('/')[1], uid)
    }
    return super.groupRT(cbFunc, 'packages', predicates, orderBy, isDescending, constructFunc(uid))
  }

  /**
   * 
   * @param {(packages: Package[]) => void} cbFunc 
   * @param {string} tenantKey 
   * @param {string} [uid] use for lastRead
   * @returns {() => void} Unsubscribe handle func
   */
  static getAbnormalPkgsGroupRTByTenantKey (cbFunc, tenantKey = '', uid = '') {
    if (!tenantKey) throw Error('error-tenantKey')
    return this._getPackagesGroupRT(cbFunc, {
      predicates: [
        {field: 'organizationKey', compare: '==', value: tenantKey},
        {field: 'isAbnormal', compare: '==', value: true}
      ], 
      orderBy: 'createTime',
      isDescending: false,
      uid
    })
  }
  
  static _getRef (warehouseKey, packageId) {
    let path = this._basePathTemplate.split('/')
    path[1] = warehouseKey
    path[3] = packageId
    return this._buildRef(path)
  }
  update () {
    if (!this._fullPath || !this.getData()) throw Error('undefined-full-path')
    return this._db.updateStore(this.getData(), this._fullPath)
  }
  insert () {
    // package key is special need to use transaction to increase the index
  }
  delete () {
    if ((!this._fullPath || !this.getData())) throw Error('undefined-full-path')
    return this._db.removeStore(this.getData(), this._fullPath)
  }
}
