import Order from './Order'

const AMAZON_CARRIER_CODES = [
  ['Blue Package'],
  ['USPS'],
  ['UPS'],
  ['FedEx', 'FEDEX_GROUND', 'FEDEX_EXPRESS_SAVER', 'FEDEX_2_DAY', 'FEDEX_2_DAY_AM', 'STANDARD_OVERNIGHT', 'PRIORITY_OVERNIGHT'],
  ['DHL'],
  ['DHL Global Mail'],
  ['Fastway'],
  ['UPS Mail Innovations'],
  ['Royal Mail'],
  ['FedEx SmartPost'],
  ['OSM'],
  ['OnTrac'],
  ['Streamlite'],
  ['Newgistics'],
  ['Canada Post'],
  ['City Link'],
  ['GLS'],
  ['GO!'],
  ['Hermes Logistik Gruppe'],
  ['Parcelforce'],
  ['TNT'],
  ['Target'],
  ['SagawaExpress'],
  ['NipponExpress'],
  ['YamatoTransport']
]

/**
 * 
 * @param {string} carrierOrCarrierService 
 */
function getCarrierCode (carrierOrCarrierService) {
  for (let carrierCode of AMAZON_CARRIER_CODES) {
    if (carrierCode.some(code => code.toLowerCase() === carrierOrCarrierService.trim().toLowerCase())) {
      return carrierCode[0]
    }
  }
  return 'Other'
}
export default class AmazonOrder extends Order {
  static fields () {
    return {
      platform: this.string('Amazon'),
      isPrime: this.boolean(false)
    }
  }

  static fileType = 'txt'

  static getFileHeader () {
    return [
      'order-id',
      'order-item-id',
      'quantity',
      'ship-date',
      'carrier-code',
      'carrier-name',
      'tracking-number',
      'ship-method',
      'transparency_code'
    ]
  }

  getFileRows () {
    return this.shipments.map(shipment => [
      this.orderId,
      shipment.orderItemId,
      shipment.quantity,
      shipment.shipDate,
      getCarrierCode(shipment.carrierCode || shipment.carrier),
      shipment.carrierName || shipment.carrier,
      shipment.trackingNumber,
      shipment.method || shipment.serviceType || '',
      shipment.transparency_code || ''
    ])
  }
}
