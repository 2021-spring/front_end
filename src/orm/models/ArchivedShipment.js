import Shipment from './Shipment'

export default class ArchivedShipment extends Shipment {
  static fields () {
    return {
      attachments: this.attr([]),
      carrier: this.string(''),
      destination: this.attr({}),
      files: this.attr([]),
      comments: this.attr([]),
      instruction: this.string(''),
      isCustom: this.boolean(false),
      isExpedited: this.boolean(false),
      keywords: this.attr([]),
      note: this.string(''),
      orgEmail: this.string(''),
      otherServices: this.attr([]),
      packageQty: this.number(1),
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
      shipmentCreateTime: this.attr()
    }
  }

  static _basePathTemplate = 'archivedShipments'
}
