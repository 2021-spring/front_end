import ViteModel from './ViteModel'

class PackageReportWarehouse extends ViteModel {
  static fields () {
    return {
      startDate: this.string('', this.isRequired('startDate')),
      endDate: this.string('', this.isRequired('endDate')),
      timeZoneOffset: this.number(0),
      tenantKey: this.string('', this.isRequired('tenantKey')),
      tenantName: this.string(''),
      zipFile: this.string('')
    }
  }

  static _basePathTemplate = 'warehouses/{warehouseKey}/packageReports'

  constructor (data, warehouseKey) {
    super(data)
    if (!warehouseKey) throw Error('warehouseKey-missing')
    this.warehouseKey = warehouseKey
    this._basePath = this.constructor._basePathTemplate.split('/')
    this._basePath[1] = warehouseKey
    if (data._key) {
      this._fullPath = [...this._basePath, data._key]
    }
  }
  static getRT (cbFunc, warehouseKey, predicates, orderBy, isDescending = true) {
    let path = this._getBase()
    path[1] = warehouseKey
    const modelData = (data) => {
      cbFunc(data.map(item => new PackageReportWarehouse(item, warehouseKey)))
    }
    return super.getRT(modelData, path, predicates, orderBy, isDescending)
  }
}

class PackageReportTenant extends ViteModel {
  static fields () {
    return {
      startDate: this.string('', this.isRequired('')),
      endDate: this.string('', this.isRequired('')),
      timeZoneOffset: this.number(0),
      createTime: this.attr(new Date()),
      lastModifiedTime: this.attr(new Date()),
      warehouseKey: this.string('', this.isRequired('')),
      warehouseName: this.string(''),
      zipFile: this.string('')
    }
  }

  static _basePathTemplate = 'tenants/{tenantKey}/packageReports'

  constructor (data, tenantKey) {
    super(data)
    if (!tenantKey) throw Error('tenantKey-missing')
    this.tenantKey = tenantKey
    this._basePath = this.constructor._basePathTemplate.split('/')
    this._basePath[1] = tenantKey
    if (data._key) {
      this._fullPath = [...this._basePath, data._key]
    }
  }
  static getRT (cbFunc, tenantKey, predicates, orderBy, isDescending = true) {
    let path = this._getBase()
    path[1] = tenantKey
    const modelData = (data) => {
      cbFunc(data.map(item => new PackageReportTenant(item, tenantKey)))
    }
    return super.getRT(modelData, path, predicates, orderBy, isDescending)
  }
}

export { PackageReportWarehouse, PackageReportTenant }
