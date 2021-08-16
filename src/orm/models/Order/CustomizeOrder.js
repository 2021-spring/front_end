import Order from './Order'

export default class CustomizeOrder extends Order {
  static fields () {
    return {
      platform: this.string('Customize'),
      shopInitial: this.string(''),
      buyerNotes: this.string(''),
      currency: this.string(''),
      reference: this.string(''),
      weight: this.number(0),
      width: this.number(0),
      length: this.number(0),
      height: this.number(0),
      serviceType: this.string(''),
      shipmentDate: this.string(''),
      signature: this.string(''),
      memo: this.string(''),
      isMeasurementMetric: this.boolean(false)
    }
  }

  static fileType = 'xlsx'

  static getFileHeader () {
    return [
      'Market Place Order ID',
      'Shop Initial',
      'Buyer Full Name',
      'Buyer Email',
      'Buyer Address 1',
      'Buyer Address 2',
      'Buyer City',
      'Buyer State',
      'Buyer ZIP/Postal Code',
      'Buyer Country',
      'Buyer Notes',
      'Buyer Phone Number',
      'Paid Date',
      'Item Number',
      'Item SKU',
      'Item Title',
      'Quantity',
      'Tracking',
      'Carrier',
      'Method',
      'Reference'
    ]
  }

  getFileRows () {
    /** @todo **/
    return this.shipments.map(shipment => {
      const product = (this.items.find(({orderItemId}) => orderItemId === shipment.orderItemId) || {})
      return [
        this.orderId,
        this.shopInitial,
        this.buyerName,
        this.buyerEmail,
        this.shipAddress1,
        this.shipAddress2,
        this.shipCity,
        this.shipState,
        this.shipPostalCode,
        this.shipCountry,
        this.buyerNotes,
        this.buyerPhoneNumber,
        this.purchaseDate,
        product.orderItemId,
        product.sku,
        product.productName,
        product.quantityPurchased,
        shipment.trackingNumber,
        shipment.carrierName || shipment.carrier,
        shipment.method || shipment.serviceType || shipment.carrierCode || '',
        this.reference
      ]
    })
  }

  constructor (data, tenantKey) {
    super(data, tenantKey)
    this.productName = (this.productName || '') + ((this._vueGetters.skuToProductIdMap.get(this.sku) || {}).name || '(SKU not defined)')
    this.items.forEach(item => {
      item.productName = (item.productName || '') + ((this._vueGetters.skuToProductIdMap.get(item.sku) || {}).name || '(SKU not defined)')
    })
  }

  getLabelService () {
    if (!this.serviceType) {
      this._customOrderServiceType = ''
      this._customOrderSignature = null
      return
    }
    for (let labelService of this._vueGetters.labelServices) {
      const {serviceTypes = [], signatureOptions = []} = labelService
      const serviceType = serviceTypes.find(
        ({text, value}) => 
          text.toLowerCase() === this.serviceType.toLowerCase() || 
          value.toLowerCase() === this.serviceType.toLowerCase()
      )
      
      if (serviceType) {
        this._customOrderServiceType = serviceType.value
        const lookingSignatureVal = (() => {
          if (this.signature.toLowerCase() === 'true') return true
          if (this.signature.toLowerCase() === 'false') return false
          return this.signature.toLowerCase()
        })()
        const signature = signatureOptions.find(
          ({text, value}) =>
            text.toLowerCase() === lookingSignatureVal ||
            (typeof value === 'string' ? value.toLowerCase() === lookingSignatureVal : value === lookingSignatureVal)
        )

        signature !== undefined && (this._customOrderSignature = signature.value)
        return
      }
    }

    this._customOrderServiceType = ''
    this._customOrderSignature = null
  }

  get serviceTypeValue () {
    this.getLabelService()
    return this._customOrderServiceType
  }

  get signatureValue () {
    this.getLabelService()
    return this._customOrderSignature
  }
}
