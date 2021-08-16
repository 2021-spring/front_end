import * as dbAccessor from '@/utils/dbAccessor'
import {Logger} from '@/utils/tools'

function updateInventoryPromise (items, warehouseKey, warehouseName, warehouseSite, siteName, isQuantityReverse = false, isSelfStorage = false) {
  const isCustom = items[0].size === 'custom'
  let productSum = items.reduce((sum, item) => {
    let {upc, organizationKey = ''} = item
    item.isAddedToInventoryOrigin = item.isAddedToInventory
    item.isAddedToInventory = false
    if (!organizationKey) {
      return sum
    }
    if (!sum[organizationKey]) {
      sum[organizationKey] = {}
    }
    if (!sum[organizationKey][upc]) {
      sum[organizationKey][upc] = {
        quantity: 0,
        warehouseSite: '',
        siteName: '',
        warehouseKey: '',
        items: []
      }
    }

    sum[organizationKey][upc].quantity = (sum[organizationKey][upc].quantity + (isQuantityReverse ? -1 : 1) * item.quantity)
    sum[organizationKey][upc].warehouseSite = item.warehouseSite || warehouseSite
    sum[organizationKey][upc].warehouseName = warehouseName || ''
    sum[organizationKey][upc].siteName = item.siteName || siteName || ''
    sum[organizationKey][upc].warehouseKey = warehouseKey
    sum[organizationKey][upc].items.push(item)
    return sum
  }, {})

  return Object.keys(productSum).reduce((promiseArr, organizationKey) => {
    let perOrganizationArr = Object.keys(productSum[organizationKey]).map(upc => {
      let predicates = [
        {
          field: `upc`,
          compare: '==',
          value: upc
        }
      ]
      let change = productSum[organizationKey][upc]
      return dbAccessor.queryWithPredicatesStore(predicates, 'tenants', organizationKey, 'inventory')
        .then(docs => {
          return dbAccessor.runInTransactionStore(transaction => {
            let warehouseInventoryKey = `${change.warehouseSite}_${organizationKey}`
            let warehouseInventoryGetter = transaction.get(dbAccessor.buildStoreQuery(['warehouses', change.warehouseKey, 'inventory', warehouseInventoryKey]))
            
            if (isQuantityReverse ? !change.items[0].isAddedToInventoryOrigin : docs.size === 0) {
              return Promise.all([warehouseInventoryGetter])
                .then(docArray => {
                  let [warehouseInventoryDoc] = docArray
                  updateWarehouseInventory(transaction, warehouseInventoryDoc, change, upc)
                  // no need to update tenant inventory and package
                })
            } else {
              if (docs.size === 0) throw Error('Organization product missing.')
              let productGetter = transaction.get(dbAccessor.buildStoreQuery(['tenants', organizationKey, 'inventory', docs.docs[0].id]))
              return Promise.all([productGetter, warehouseInventoryGetter])
                .then(docArray => {
                  let [organizationInventoryDoc, warehouseInventoryDoc] = docArray
                  updateOrganizationInventory(transaction, organizationInventoryDoc, change, isCustom, isSelfStorage)
                  updateWarehouseInventory(transaction, warehouseInventoryDoc, change, upc)
                  
                  change.items.forEach(item => { 
                    item.isAddedToInventory = true 
                  })
                  return 'success'
                })
            }
          })
            .catch((error) => {
              change.items.forEach(item => { 
                item.isAddedToInventory = item.isAddedToInventoryOrigin 
              })
              throw error
            })
        })
    })
    return [...promiseArr, ...perOrganizationArr]
  }, [])
}

function updateOrganizationInventory (transaction, organizationInventoryDoc, change, isCustom, isSelfStorage) {
  if (organizationInventoryDoc.exists) {
    let product = organizationInventoryDoc.data()
    let productId = organizationInventoryDoc.id
    let addressEncode = isSelfStorage ? `warehouse${productId}${Buffer.from(change.siteName).toString('base64')}` : Buffer.from('warehouse' + productId + change.warehouseSite)
    let distribution = product.distribution ? product.distribution : {}

    let oldValue = (distribution[addressEncode] && distribution[addressEncode].quantity) || 0
    distribution[addressEncode] = isSelfStorage ? {
      uid: change.warehouseKey,
      userName: 'self',
      warehouseSite: `self-${change.siteName}`,
      siteName: change.siteName,
      quantity: oldValue + change.quantity
    } : {
      uid: change.warehouseKey,
      userName: change.warehouseName,
      warehouseSite: change.warehouseSite,
      siteName: change.siteName || change.warehouseSite,
      quantity: oldValue + change.quantity,
      warehouseKey: change.warehouseKey,
      isCustom
    }

    let quantity = product['quantity'] ? product['quantity'] + change.quantity : change.quantity
    let inbound = product['inbound'] ? product['inbound'] + change.quantity : change.quantity
    let newValue = {
      distribution,
      quantity,
      inbound
    }
    transaction.update(organizationInventoryDoc.ref, dbAccessor.addUpdateDocTimestamp(newValue))
  }
}

function updateWarehouseInventory (transaction, warehouseInventoryDoc, change, upc) {
  if (warehouseInventoryDoc.exists) {
    let {distribution} = warehouseInventoryDoc.data()
    if (distribution && distribution[upc]) {
      distribution[upc] += change.quantity
    } else if (!distribution) {
      distribution = {
        [upc]: change.quantity
      }
    } else {
      distribution[upc] = change.quantity
    }
    if (distribution[upc] === 0) delete distribution[upc]
    if (Object.keys(distribution).length >= 3000) {
      Logger.critical('warehouseHelper', {msg: 'distribution-size-exceed', change, upc, inventoryId: warehouseInventoryDoc.id})
      throw Error('distribution-size-exceed')
    }
    transaction.update(warehouseInventoryDoc.ref, dbAccessor.addUpdateDocTimestamp({distribution}))
  } else {
    let inventoryData = {
      tenantKey: change.items[0].organizationKey,
      siteKey: change.warehouseSite,
      distribution: {
        [upc]: change.quantity
      }
    }
    transaction.set(warehouseInventoryDoc.ref, dbAccessor.addNewDocTimestamp(inventoryData))
  }
}

export {updateInventoryPromise}
