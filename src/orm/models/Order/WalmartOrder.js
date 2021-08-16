import Order from './Order'

function getTrackingUrl (carrier, trackingNumber) {
  const urls = {
    usps: 'https://tools.usps.com/go/TrackConfirmAction?tRef=fullpage&tLc=2&text28777=&tLabels=' + trackingNumber,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ups: `http://wwwapps.ups.com/WebTracking/track?track=yes&trackNums=${trackingNumber}&loc=en_us`
  }

  return urls[carrier.toLowerCase()] || ''
}

/**
 * 
 * @param {string} service 
 */
function getCarrier (service) {
  if (/fedex/gi.test(service)) return 'fedex'
  if (/usps/gi.test(service)) return 'usps'
  if (/ups/gi.test(service)) return 'ups'
  return service
}

export default class WalmartOrder extends Order {
  static fields () {
    return {
      platform: this.string('Walmart'),
      poNo: this.string(''),
      buyerShippingAddress: this.string(''),
      flids: this.number(0),
      lineNo: this.number(0),
      upc: this.string(''),
      walmartStatus: this.string(''),
      shippingMethod: this.string(''),
      itemCost: this.number(0),
      shippingCost: this.number(0),
      tax: this.number(0),
      sellerOrderNo: this.string(''),
      fulfillmentEntity: this.string(''),
      segment: this.string(''),
      shippingSLA: this.string(''),
      shippingConfigSource: this.string(''),
      replacementOrder: this.string(''),
      originalCustomerOrderId: this.string('')
    }
  }

  static getFileHeader () {
    return [
      'PO#',
      'Order#',
      'Order Date',
      'Ship By',
      'Delivery Date',
      'Customer Name',
      'Customer Shipping Address',
      'Customer Phone Number',
      'Ship to Address 1',
      'Ship to Address 2',
      'City',
      'State',
      'Zip',
      'Segment',
      'FLIDS',
      'Line#',
      'UPC',
      'Status',
      'Item Description',
      'Shipping Method',
      'Shipping Tier',
      'Shipping SLA',
      'Shipping Config SOurce',
      'Qty',
      'SKU',
      'Item Cost',
      'Shipping Cost',
      'Tax',
      'Update Status',
      'Update Qty',
      'Carrier',
      'Tracking Number',
      'Tracking Url',
      'Seller Order NO',
      'Fulfillment Entity',
      'Replacement Order',
      'Original Customer Order Id'
    ]
  }

  getFileRows () {
    return this.shipments.map(shipment => {
      const product = (this.items.find(({orderItemId}) => orderItemId === shipment.orderItemId) || {})
      return [
        this.poNo,
        this.orderId,
        new Date(this.purchaseDate).toISOString().slice(0, 10),
        new Date(this.paymentsDate).toISOString().slice(0, 10),
        new Date(this.promiseDate).toISOString().slice(0, 10),
        this.buyerName,
        this.buyerShippingAddress,
        this.buyerPhoneNumber,
        this.shipAddress1,
        this.shipAddress2,
        this.shipCity,
        this.shipState,
        this.shipPostalCode,
        this.segment,
        this.flids,
        this.lineNo,
        this.upc,
        this.walmartStatus,
        product.productName || '',
        this.shippingMethod,
        this.shippingSLA,
        this.shippingConfigSource,
        this.shipServiceLevel,
        product.quantityPurchased,
        product.sku,
        this.itemCost,
        this.shippingCost,
        this.tax,
        /** 
         * Walmart status: 
         *  Ordered
         *  Acknowledge
         *  Ship
         *  Cancel - Pricing Error
         *  Cancel - Out of Stock
         *  Cancel - Duplicate Order
         *  Cancel - Change Something on an Order
         *  Cancel - Incorrect Shipping Address
         *  Cancel - Fraud Stop Shipment
         *  Cancel - Customer Change Mind
         */
        'Ship', 
        product.quantityShipped,
        getCarrier(shipment.carrierName || shipment.carrierCode),
        shipment.trackingNumber,
        getTrackingUrl(getCarrier(shipment.carrierName), shipment.trackingNumber),
        this.sellerOrderNo,
        this.fulfillmentEntity,
        this.replacementOrder,
        this.originalCustomerOrderId
      ]
    })
  }
}
