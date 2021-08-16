import ViteModel from '../ViteModel'
import { toPickerDateString } from '@/utils/tools'

export default class Order extends ViteModel {
  static baseFields () {
    return {
      ...ViteModel.baseFields(),
      buyerEmail: this.string(''),
      buyerName: this.string(''),
      buyerPhoneNumber: this.string(''),
      daysPastPromise: this.number(-1),
      isBusinessOrder: this.boolean(false),
      items: this.attr([]),
      keywords: this.attr([]),
      orderId: this.string(''),
      paymentsDate: this.attr(new Date()),
      productName: this.string(''),
      promiseDate: this.attr(new Date()),
      purchaseDate: this.attr(new Date()),
      recipientName: this.string(''),
      reportingDate: this.attr(new Date()),
      shipments: this.attr([]),
      shipAddress1: this.string(''),
      shipAddress2: this.string(''),
      shipCity: this.string(''),
      shipCountry: this.string(''),
      shipPostalCode: this.string(''),
      shipServiceLevel: this.string(''),
      shipState: this.string(''),
      status: this.string('')
    }
  }

  static _basePathTemplate = 'tenants/{tenantKey}/orders'

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
    this.sku = this.items.map(item => item.sku).join(' ')
  }

  /** @override */
  static getFileHeader () {
    return []
  }

  /** @override */
  getFileRows () {
    return []
  }

  get keywordsForSearch () {
    return this.items.map(item => item.productName + item.sku).join(' ')
  }

  /**
   * 
   * @param {Map} [fileMap] 
   */
  exportToFileMap (fileMap) {
    if (!(fileMap instanceof Map)) {
      fileMap = new Map()
    }
    if (!fileMap.has(this.platform)) {
      fileMap.set(this.platform, {
        name: `orders-${this.platform}-${toPickerDateString(new Date())}`,
        fileType: this.constructor.fileType,
        content: [this.constructor.getFileHeader()]
      })
    }
    const fileObj = fileMap.get(this.platform)
    fileObj.content.push(...this.getFileRows())

    fileMap.set(this.platform, fileObj)

    return fileMap
  }

  static fileType = 'xlsx'
}
