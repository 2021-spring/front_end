export class AuditRecord {
  constructor (data) {
    const {inventoryDocs, ...rest} = data
    Object.assign(this, rest, this.calculateDistSum(inventoryDocs))
  }

  calculateDistSum (inventoryDocs) {
    const upcMap = inventoryDocs.docs.reduce((acc, doc) => {
      const {distribution = {}, abnormalDistribution = {}} = doc.data() || {}
      Object.entries(distribution).forEach(([upc, qty]) => {
        acc[upc] = acc[upc] || {qty: 0, abnormalQty: 0}
        acc[upc].qty += qty
      })
      Object.entries(abnormalDistribution).forEach(([upc, abnormalQty]) => {
        acc[upc] = acc[upc] || {qty: 0, abnormalQty: 0}
        acc[upc].abnormalQty += abnormalQty
      })
      return acc
    }, {})

    const upcs = Object.entries(upcMap).map(([upc, val]) => {
      return {
        upc,
        ...val,
        isConfirmed: false,
        auditQty: 0,
        abnormalAuditQty: 0,
        note: ''
      }
    })

    return {
      upcs
    }
  }

  getData () {
    return {
      ...this,
      status: 'pending'
    }
  }
}
