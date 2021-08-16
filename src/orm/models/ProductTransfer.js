import ViteModel from './ViteModel'

export default class ProductTransfer extends ViteModel {
  static fields () {
    return {
      location: this.string('', this.isRequired('location')),
      note: this.string(''),
      from: this.string('', this.isRequired('from')),
      fromName: this.string('', this.isRequired('fromName')),
      to: this.string('', this.isRequired('to')),
      toName: this.string('', this.isRequired('toName')),
      isPending: this.boolean(true),
      warehouseKey: this.string('', this.isRequired('warehouseKey')),
      warehouseName: this.string(''),
      uid: this.string('', this.isRequired('uid')),
      involvedKeys: this.attr([]),
      warehouseSite: this.string('', this.isRequired('warehouseSite')),
      files: this.attr([]),
      items: this.attr([]),
      userKey: this.string(''),
      userName: this.string(''),
      pendingPeriod: this.number(),
      transactionId: this.string(''),
      isCanceled: this.boolean(false)
    }
  }

  static _basePathTemplate = 'transferTransactions'
  _basePath = ['transferTransactions']

  constructor (data) {
    super(data)
    this._fullPath = ['transferTransactions', this._key]
  }

  static getRT (cbFunc, predicates, orderBy, isDescending = true) {
    let path = this._getBase()
    return super.getRT(cbFunc, path, predicates, orderBy, isDescending, true)
  }

  insert () {
    return this._db.callFunction('updateProductTransfer', {actionType: 'create', ...this.getData()})
  }

  addToInventory () {
    return this._db.callFunction('updateProductTransfer', {actionType: 'add', ...this.getData(), key: this._key})
  }

  delete () {
    return this._db.callFunction('updateProductTransfer', {actionType: 'cancel', ...this.getData(), key: this._key})
  }
}
