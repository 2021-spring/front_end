import ViteModel, {Model} from './ViteModel'

/**
 * @property {any[]} inbound 
 */
export default class PriceHistory extends ViteModel {
  static fields () {
    return {
      inbound: this.attr([])
    }
  }
  static _basePathTemplate = 'tenants/{tenantKey}/priceHistory'

  /**
   * 
   * @param {*} data 
   * @param {firebase.firestore.DocumentReference} docRef 
   */
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

  /**
   * 
   * @param {string[]} path 
   * @param {{
   *  allowSelf: boolean
   * }} data 
   */
  addPriceHistoryOfferItem (data) {
    let items = []
    items.push(getNewOfferWarehouseItem(data))
    data.allowSelf && items.push(getNewOfferSelfItem(data)) 
    const updateItems = items.filter(item => 
      !this.inbound.some(priceItem =>
        priceItem.type === item.type &&
        priceItem.offerId === item.offerId &&
        priceItem.price === item.price && (
          item.type === 'offerSelf' ? item.bonus === priceItem.bonus : true
        )
      )
    )
    updateItems.length && this.inbound.push(...updateItems)
    return this
  }

  /**
   * @param {string} tenantKey 
   * @param {string} productId 
   * @returns {PriceHistory}
   */
  static async get (tenantKey, productId) {
    try {
      const ph = await super.get('tenants', tenantKey, 'priceHistory', productId)
      return ph
    } catch (err) {
      if (err.message === 'doc-not-exist') {
        // create doc
        return new PriceHistory({_key: productId}, tenantKey)
      }
      throw err
    }
  }

  async update () {
    try {
      await super.update()
    } catch (err) {
      if (err.code === 'not-found') {
        this.insert()
        return
      }
      throw err
    }
  }
}

function getNewOfferWarehouseItem (data) {
  return {
    type: 'offerWarehouse',
    offerId: Model.string('', Model.isRequired('offerId'))(data.offerId),
    price: Model.number(0, Model.isRequired('price'))(data.price),
    dateTime: new Date(),
    quantity: 0
  }
}

function getNewOfferSelfItem (data) {
  return {
    type: 'offerSelf',
    offerId: Model.string('', Model.isRequired('offerId'))(data.offerId),
    price: Model.number(0, Model.isRequired('price'))(data.price),
    bonus: Model.number(0)(data.bonus),
    dateTime: new Date(),
    quantity: 0
  }
}
