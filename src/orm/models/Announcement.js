import ViteModel from './ViteModel'

export default class Announcement extends ViteModel {
  static get roleCount () {
    return 3
  }
  static get systemCode () {
    return 'system'
  } 
  static get warehouseCode () {
    return 'warehouse'
  }
  static get tenantCode () {
    return 'tenant'
  }
  static get userCode () {
    return 'user'
  }

  static get getBasePath () {
    return this._basePathTemplate.split('/')
  }

  static fields () {
    return {
      broadcasterType: this.string('', this.isRequired('broadcasterType')), 
      broadcasterName: this.string('', this.isRequired('broadcasterName')), 
      broadcasterKey: this.string('', this.isRequired('broadcasterKey')),
      msgType: this.attr([]), // SIGN [user, tenant, warehouse]
      msgContent: this.string(''),
      startDate: this.attr(new Date()),
      endDate: this.attr(new Date())
    }
  }

  static _basePathTemplate = 'announcements'
  
  constructor (data) {
    // set data, New Data
    super(data)
    this.setMsgType(data.msgType || [])
    this._basePath = this.constructor._basePathTemplate.split('/')
    if (data._key) {
      this._fullPath = [...this._basePath, data._key]
    }
  }

  insert () {
    console.log(this.getData(), ...this._basePath)
    return this._db.insertStore(this.getData(), ...this._basePath)
  }

  delete () {
    return this._db.removeStore(...this._fullPath)
  }

  update (payload) {
    this.delete() 
    return this.insert()
  }

  static deleteByKey (key) {
    if (typeof key !== 'string' || key.length === 0) throw Error('Error key of Announcement')
    return ViteModel._db.removeStore(...this.getBasePath, key)
  }

  static getRT (cbFunc, predicates, orderBy = '', isdescending = true) {
    return super.getRT(cbFunc, this.getBasePath, predicates, orderBy, isdescending, true)
  }

  static getByTenantRT (cbFunc, tenantKey) {
    let predicates = [{field: 'broadcasterKey', compare: '==', value: tenantKey}]
    return this.getRT(cbFunc, predicates)
  } 

  static getByWarehouseRT (cbFunc, warehouseKey) {
    let predicates = [{field: 'broadcasterKey', compare: '==', value: warehouseKey}]
    return this.getRT(cbFunc, predicates)
  } 

  static getByAdminRT (cbFunc) {
    let predicates = [{field: 'broadcasterType', compare: '==', value: this.systemCode}]
    return this.getRT(cbFunc, predicates)
  }

  static getSysAnnouncementsRT (userTypeCode, cbFunc) {
    let predicates = [
      {field: 'broadcasterType', compare: '==', value: this.systemCode},
      {field: 'msgType', compare: 'array-contains', value: userTypeCode},
      {field: 'endDate', compare: '>', value: (new Date())}
    ]
    return this.getRT(cbFunc, predicates)
  }

  static getUserTypeCode (tenant = '', warehouse = '') {
    let code = 0 
    if (tenant) code = this.tenantCode
    else if (warehouse) code = this.warehouseCode
    else code = this.userCode
    return code
  }

  static getUpstreamAnnouncementsRT (broadcasterKey, cbFunc) {
    let predicates = [
      {field: 'broadcasterKey', compare: '==', value: broadcasterKey},
      {field: 'endDate', compare: '>', value: (new Date())}
    ]
    return this.getRT(cbFunc, predicates)
  }
  static getWarehouseAnnouncementsRT (warehouseKey, cbFunc) {
    return this.getUpstreamAnnouncementsRT(warehouseKey, cbFunc)
  }

  static getTenantAnnouncementsRT (tenantKey, cbFunc) {
    return this.getUpstreamAnnouncementsRT(tenantKey, cbFunc)
  }

  /**
   * warehouse -> tenant, tenant -> user
   * @param {Announcement.warehouseCode | Announcement.tenantCode} broadcasterType 
   */
  setMsgType (types = []) {
    let msgType = []
    if (this.broadcasterType === this.constructor.systemCode) {
      this.msgType = msgType.concat(msgType, types)
    } else {
      if (this.broadcasterType === this.constructor.warehouseCode) {
        msgType.push(this.constructor.tenantCode)
      } else if (this.broadcasterType === this.constructor.tenantCode) {
        msgType.push(this.constructor.userCode)
      } 
      this.msgType = msgType
    }
  }

  getMsgMapKey () {
    switch (this.broadcasterType) {
      case this.constructor.systemCode:
        return 'sys'
      case this.constructor.warehouseCode:
      case this.constructor.tenantCode:
        return this.broadcasterKey
    
      default:
        throw Error('Error broadcasterType')
    }
  }
}
