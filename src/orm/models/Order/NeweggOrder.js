import Order from './Order'

const CARRIERS = [
  ['USPS'],
  ['UPS'],
  ['FedEx', 'FEDEX_GROUND', 'FEDEX_EXPRESS_SAVER', 'FEDEX_2_DAY', 'FEDEX_2_DAY_AM', 'STANDARD_OVERNIGHT', 'PRIORITY_OVERNIGHT']
]

function getCarrier (carrierOrCarrierService) {
  for (let carrier of CARRIERS) {
    if (carrier.some(code => code.toLowerCase() === carrierOrCarrierService.toLowerCase())) {
      return carrier[0]
    }
  }
  return 'Other'
}
export default class NeweggOrder extends Order {
  static fields () {
    return {
      platform: this.string('Newegg'),
      salesChannel: this.string(''),
      fulfillmentOption: this.string(''),
      shipCountry: this.string(''),
      shipFirstName: this.string(''),
      shipLastName: this.string(''),
      shipCompany: this.string(''),
      itemUnitPrice: this.number(0),
      extendUnitPrice: this.number(0),
      itemUnitShippingCharge: this.number(0),
      extendShippingCharge: this.number(0),
      extendVAT: this.string(''),
      extendDuty: this.string(''),
      orderShippingTotal: this.number(0),
      orderDiscountAmount: this.number(0),
      salesTax: this.number(0),
      VATTotal: this.number(0),
      dutyTotal: this.number(0),
      orderTotal: this.number(0)
    }
  }

  static fileType = 'csv'

  static getFileHeader () {
    return [
      'Order Number',
      'Order Date & Time',
      'Sales Channel',
      'Fulfillment Option',
      'Ship To Address Line 1',
      'Ship To Address Line 2',
      'Ship To City',
      'Ship To State',
      'Ship To ZipCode',
      'Ship To Country',
      'Ship To First Name',
      'Ship To LastName',
      'Ship To Company',
      'Ship To Phone Number',
      'Order Customer Email',
      'Order Shipping Method',
      'Item Seller Part #',
      'Item Newegg #',
      'Item Unit Price',
      'Extend Unit Price',
      'Item Unit Shipping Charge',
      'Extend Shipping Charge',
      'Extend VAT',
      'Extend Duty',
      'Order Shipping Total',
      'Order Discount Amount',
      'Sales Tax',
      'VAT Total',
      'Duty Total',
      'Order Total',
      'Quantity Ordered',
      'Quantity Shipped',
      'Actual Shipping Carrier',
      'Actual Shipping Method',
      'Tracking Number'
    ]
  }

  getFileRows () {
    return this.shipments.map(shipment => {
      const product = (this.items.find(({orderItemId}) => orderItemId === shipment.orderItemId) || {})
      return [
        this.orderId,
        this.purchaseDate,
        this.salesChannel || 'Newegg',
        this.fulfillmentOption,
        this.shipAddress1,
        this.shipAddress2,
        this.shipCity,
        this.shipState,
        this.shipPostalCode,
        this.shipCountry,
        this.shipFirstName,
        this.shipLastName,
        this.shipCompany,
        this.buyerPhoneNumber,
        this.buyerEmail,
        this.shipServiceLevel,
        product.sku,
        product.orderItemId,
        this.itemUnitPrice,
        this.extendUnitPrice,
        this.itemUnitShippingCharge,
        this.extendShippingCharge,
        this.extendVAT,
        this.extendDuty,
        this.orderShippingTotal,
        this.orderDiscountAmount,
        this.salesTax,
        this.VATTotal,
        this.dutyTotal,
        this.orderTotal,
        product.quantity,
        shipment.quantity,
        getCarrier(shipment.carrier),
        shipment.method || shipment.serviceType || '',
        shipment.trackingNumber
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
}
