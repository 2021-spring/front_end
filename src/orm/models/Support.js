import ViteModel from './ViteModel'
import { getRandomIdByTime, splitProductName as splitTitle } from '@/utils/tools'

export default class Support extends ViteModel {
  static fields () {
    return {
      attachments: this.attr([]),
      caseNumber: this.string('', v => {
        if (v) return v
        return getRandomIdByTime(3)
      }),
      title: this.string('', this.isRequired('title')),
      category: this.string('other', this.isRequired('category')),
      question: this.string('', this.isRequired('question')),
      tracking: this.string(''),
      upc: this.string(''),
      quantity: this.string(''),
      shipmentId: this.string(''),
      status: this.string('pending'),
      comments: this.attr([]),
      internalComments: this.attr([]),
      tenantKey: this.string('', this.isRequired('tenantKey')),
      tenantName: this.string('', this.isRequired('tenantName')),
      warehouseKey: this.string('system', this.isRequired('warehouseKey')),
      warehouseName: this.string('system', this.isRequired('warehouseName')),
      agentUid: this.string(''),
      agentName: this.string(''),
      keywords: this.attr([]),
      keywordDisplay: this.string(''),
      labelId: this.string('')
    }
  }

  static _basePathTemplate = 'supports'

  static get getBasePath () {
    return this._basePathTemplate.split('/')
  }
  
  constructor (data) {
    // set data, New Data
    super(data)
    if (data.uid) this[`lastRead_${data.uid}`] = data[`lastRead_${data.uid}`] || ''
    this._basePath = this.constructor._basePathTemplate.split('/')
    if (data._key) {
      this._fullPath = [...this._basePath, data._key]
    }
    // build keywords if keyword no exists
    if (this.keywords.length < 1) {
      // [tenantName, orgId, caseNumber, split(title), category]
      this.keywords = [
        this.tenantName,
        data.orgId || '',
        this.caseNumber,
        this.category,
        this.title,
        this.upc,
        this.tracking,
        this.shipmentId,
        this.labelId || '',
        ...splitTitle(this.title)
      ].map(item => item.toUpperCase())
    }
  }

  insert () {
    return this._db.insertStore(this.getData(), ...this._basePath)
  }

  delete () {
    return this._db.removeStore(...this._fullPath)
  }

  updateStatus () {
    return this._db.updateFieldsStore({
      status: this.status
    }, ...this._fullPath)
  }

  static updateByKey (fields, key) {
    return this._db.updateFieldsStore(this._db.addUpdateDocTimestamp(fields), this._basePathTemplate, key)
  }

  static getRT (cbFunc, predicates, uid = '', orderBy = '', isdescending = true) {
    const successFunc = (supports) => {
      let data = supports.map(support => new this({...support, uid}))
      cbFunc(data)
    }
    return super.getRT(successFunc, this.getBasePath, predicates, orderBy, isdescending)
  }

  static getByTenantRT (cbFunc, tenantKey, uid) {
    let predicates = [
      {field: 'tenantKey', compare: '==', value: tenantKey},
      {field: 'status', compare: 'in', value: ['pending', 'in progress']}
    ]
    return this.getRT(cbFunc, predicates, uid)
  } 

  static getByWarehouseRT (cbFunc, warehouseKey, uid) {
    let predicates = [
      {field: 'warehouseKey', compare: '==', value: warehouseKey},
      {field: 'status', compare: 'in', value: ['pending', 'in progress']}
    ]
    return this.getRT(cbFunc, predicates, uid)
  } 

  static getByUserRT (cbFunc, uid) {
    let predicates = [
      {field: 'agentUid', compare: '==', value: uid},
      {field: 'status', compare: 'in', value: ['pending', 'in progress']}
    ]
    return this.getRT(cbFunc, predicates, uid)
  }

  static getByAdminRT (cbFunc, uid) {
    let predicates = [
      {
        field: 'warehouseKey', 
        compare: '==', 
        value: 'system'
      }, {
        field: 'status', 
        compare: 'in', 
        value: ['pending', 'in progress']
      }
    ]
    return this.getRT(cbFunc, predicates, uid)
  }

  static deleteByKey (key) {
    if (typeof key !== 'string' || key.length === 0) throw Error('Error key of Instance')
    return ViteModel._db.removeStore(...this.getBasePath, key)
  }
}
