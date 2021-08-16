import ViteModel from './ViteModel'
import { getRandomIdByTime, cloneDeep, splitTrackingNum } from '../../utils/tools'

class AddPreprocessor {
  constructor (selectedOrder, selectedProducts) {
    // deep clone to avoid multi tab dirty write
    this.order = cloneDeep(selectedOrder)
    this.products = cloneDeep(selectedProducts)
    this.change = {}
    this.initialize()
  }

  initialize () {
    let {items, orderId, platform} = this.order
    this.change = {}

    if (items.length === 1) {
      let {sku, quantityPurchased, productName, orderItemId} = items[0]
      let fulfillQty = this.products.reduce((acc, product) => acc + product.toShip, 0)
      this.change[sku] = {fulfillQty, quantityPurchased, productName, orderItemId}
    } else {
      items.forEach(item => {
        let {sku, quantityPurchased, productName, orderItemId} = item
        // for each item in an order, assuming one product(upc) can only fulfill one (order)sku
        let fulfillQty = this.products.reduce((acc, product) => {
          if (product.sku && product.sku.includes(sku)) return acc + product.toShip
          return acc
        }, 0)
  
        this.change[sku] = {fulfillQty, quantityPurchased, productName, orderItemId}
      })
    }

    this.change['orderInfo'] = {_key: `${platform}-${orderId}`}
  }
  
  getOrderChange () {
    // entries include [sku] and orderInfo
    return this.change
  }
}

export default class Shipment extends ViteModel {
  static fields () {
    return {
      attachments: this.attr([]),
      carrier: this.string(''),
      destination: this.attr({}),
      files: this.attr([]),
      comments: this.attr([]),
      draftComments: this.attr([]),
      instruction: this.string(''),
      isCustom: this.boolean(false),
      isExpedited: this.boolean(false),
      keywords: this.attr([]),
      note: this.string(''),
      orgEmail: this.string(''),
      otherServices: this.attr([]),
      packageQty: this.number(0, this.isRequired('packageQty')),
      products: this.attr(null, this.isRequired('products')),
      shipmentId: this.string(''),
      snRecords: this.attr([]),
      status: this.string('created'),
      tenantKey: this.string('', this.isRequired('tenantKey')),
      tenantName: this.string('', this.isRequired('tenantName')),
      trackingNum: this.string(''),
      userKey: this.string(''),
      userName: this.string(''),
      warehouseKey: this.string(''),
      zipFile: this.string(''),
      zipfileDownloadURL: this.string(''),
      workerKey: this.string(''),
      workerName: this.string(''),
      orderChange: this.attr(null),
      relatedOrder: this.string(''),
      labels: this.attr([]),
      exceptionRootFields: this.attr({}),
      creator: this.string('')
    }
  }

  static _basePathTemplate = 'shipments'
  static _fullPath

  _setKeywords () {
    this.keywords = this.products.reduce((pre, cur) => [
      ...pre,
      cur.upc, 
      ...(cur.asin || []).map(asinItem => asinItem.toUpperCase())
    ], [...new Set([
      this._key, 
      ...splitTrackingNum(this.note), 
      ...(this.destination ? 
        [
          ...splitTrackingNum((this.destination.content || '').trim()), 
          ...splitTrackingNum((this.destination.name || '').trim()),
          ((this.destination.content || '').trim()).toUpperCase(),
          ((this.destination.name || '').trim()).toUpperCase()
        ] : 
        [''])])]) // keep _key the first element
  }

  _updateKeywordString () {
    this.keywordString = [
      ...this.keywords,
      ...this.products.map(({name}) => name)
    ].join(', ')
  }

  constructor (data, isNewDoc = false) {
    super(data, isNewDoc)
    this._basePath = this.constructor._basePathTemplate.split('/')
    if (!this._key) {
      this._key = getRandomIdByTime(3)
    }
    this._fullPath = [...this._basePath, this._key]
    if (!this.keywords.length) {
      this._setKeywords()
    }
    this._updateKeywordString()
    if (data.selectedOrder) {
      let {selectedOrder, selectedProducts} = data
      const preprocessor = new AddPreprocessor(selectedOrder, selectedProducts)
      this.orderChange = preprocessor.getOrderChange()
      this.relatedOrder = selectedOrder.orderId
      this.keywords.push(this.relatedOrder)
    }
  }

  static getRT (cbFunc, predicates, orderBy, isDescending = true) {
    return super.getRT(cbFunc, this._getBase(), predicates, orderBy, isDescending, true)
  }
  getData () {
    return {...super.getData(), ...this.exceptionRootFields}
  }
  update () {
    if (!this._fullPath) throw Error('undefined-full-path')
    return this._db.updateStore(this.getData(), this._fullPath)
  }
  insert () {
    return this.update()
  }
  insertT (transaction) {
    if (!this._fullPath) throw Error('insertT-error')
    return super.insertT(transaction, this._fullPath)
  }
  insertOrUpdateT (transaction) {
    if (!this._fullPath) throw Error('insertOrUpdateT-error')
    return super.insertOrUpdateT(transaction, this._fullPath)
  }
}
