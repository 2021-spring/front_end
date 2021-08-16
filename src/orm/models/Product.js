import ViteModel from './ViteModel'

export default class Product extends ViteModel {
  static fields () {
    return {
      asin: this.attr([]),
      condition: this.string('', this.isRequired('condition')),
      distribution: this.attr({}),
      id: this.string(''),
      inbound: this.number(0, this.isRequired('inbound')),
      name: this.string('', this.isRequired('name')),
      note: this.string(''),
      quantity: this.number(0, this.isRequired('quantity')),
      upc: this.string('')
    }
  }

  static _basePathTemplate = 'tenants/{tenantKey}/inventory'

  constructor (data, tenantKey) {
    super(data)
    if (!tenantKey) throw Error('tenantKey-missing')
    this.tenantKey = tenantKey
    if (tenantKey) {
      this._basePath = this.constructor._basePathTemplate.split('/')
      this._basePath[1] = tenantKey
      if (data._key) {
        this._fullPath = [...this._basePath, data._key]
      }
    }
  }
  static async getT (transaction, tenantKey, productId) {
    if (!tenantKey || !productId) throw Error('undefined-full-path')
    const ref = this._getRef(tenantKey, productId)
    let rawData = await super.getT(transaction, ref)
    return new Product(rawData, tenantKey)
  }
  
  static _getRef (tenantKey, productId) {
    let path = this._basePathTemplate.split('/')
    path[1] = tenantKey
    path[3] = productId
    return this._buildRef(path)
  }
  update () {
    if (!this._fullPath || !this.getData()) throw Error('undefined-full-path')
    return this._db.updateStore(this.getData(), this._fullPath)
  }
  insert () {
    // product key is special need to use transaction to increase the index
  }
  delete () {
    if ((!this._fullPath || !this.getData())) throw Error('undefined-full-path')
    return this._db.removeStore(this.getData(), this._fullPath)
  }
}
