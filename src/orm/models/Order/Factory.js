import xlsx from 'xlsx'
import Order from './Order'
import AmazonOrder from './AmazonOrder'
import EbayOrder from './EbayOrder'
import WalmartOrder from './WalmartOrder'
import NeweggOrder from './NeweggOrder'
import CustomizeOrder from './CustomizeOrder'
const ORDER_PLATFORM = {
  'amazon': AmazonOrder,
  'ebay': EbayOrder,
  'walmart': WalmartOrder,
  'newegg': NeweggOrder,
  'customize': CustomizeOrder
}

export default class OrderFactory {
  /**
   * 
   * @param {Order[]} orders 
   * @param {object} options 
   */
  static exportOrdersToFiles (orders = [], options = {}) {
    const fileMap = new Map()
    orders.forEach(order => { order.exportToFileMap(fileMap) })
    fileMap.forEach((fileObj) => {
      if (fileObj.content.length <= 1) return
      const book = xlsx.utils.book_new()
      const sheet = xlsx.utils.aoa_to_sheet(fileObj.content)
      xlsx.utils.book_append_sheet(book, sheet, 'sheet1')
      xlsx.writeFile(book, `${fileObj.name}.${fileObj.fileType}`, {bookType: fileObj.fileType})
    })
  }

  static makeOrder (data, tenantKey) {
    const {platform = ''} = data
    if (Object.keys(ORDER_PLATFORM).includes(platform.toLowerCase())) {
      return new ORDER_PLATFORM[platform.toLowerCase()](data, tenantKey)
    }
    return new Order(data, tenantKey)
  }
}
