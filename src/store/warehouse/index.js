// For Unit test before fixed
// import {dbAccessor} from '@/utils/dbAccessor'
import * as dbAccessor from '@/utils/dbAccessor'
import {getNullFields, Logger, convertTimestampToDateInObj, addNumbers, toMoney, sortNoCase, deepEqual, getRandomIdByTime} from '@/utils/tools'
import EmailBodyBuilder from '@/utils/EmailBodyBuilder'
import {updateInventoryPromise} from './warehouseHelper'
import { Announcement, PackageReportWarehouse, Package } from '@/orm'
import {AuditRecord} from './warehouseModel'

const initialState = {
  warehouseLimitedInfo: {},
  settingPromotions: [],
  warehouseOrganizations: [],
  warehouseBillings: [],
  warehouseAnnouncements: [],
  packageReports: [],
  abnormalPackages: [],
  statistics: {},
  inboundTrackingCache: [],
  dailyInboundMap: new Map(),
  pickupRecords: []
}

const state = Object.assign({}, initialState)

export const mutations = {
  reset_state (state) {
    for (let prop in state) {
      state[prop] = initialState[prop]
    }
  },
  setWarehouseLimitedInfo (state, payload) {
    state.warehouseLimitedInfo = payload
  },
  setSettingPromotions (state, payload) {
    state.settingPromotions = payload
  },
  setWarehouseOrganizations (state, payload) {
    state.warehouseOrganizations = payload
  },
  setWarehouseBillings (state, payload) {
    state.warehouseBillings = payload
  },
  setWarehouseAnnouncements (state, payload) {
    state.warehouseAnnouncements = payload
  },
  setPackageReports (state, payload) {
    state.packageReports = payload
  },
  setAbnormalPackages (state, payload) {
    state.abnormalPackages = payload
  },
  setStatistics (state, payload) {
    state.statistics = payload
  },
  setWarehouseListed (state, payload) {
    state.warehouseLimitedInfo.isListed = payload
  },
  setTempSkus (state, payload) {
    state.tempSkus = payload
  },
  setInboundTrackingCache (state, payload) {
    state.inboundTrackingCache = payload
  },
  setDailyInboundMap (state, payload) {
    state.dailyInboundMap = payload
  },
  setPickupRecords (state, payload) {
    state.pickupRecords = payload
  }
}

export const actions = {
  reset_state ({commit}) {
    commit('reset_state')
  },
  loadWarehouseOrganizations ({commit, getters}) {
    if (!getters.activeWarehouse) {
      return
    }

    let successFunc = (orgDocs) => {
      let organizations = orgDocs.docs.map(doc => {
        let organization = convertTimestampToDateInObj(doc.data())
        let key = doc.id
        return {key, ...organization}
      })
      commit('setWarehouseOrganizations', organizations)
    }

    let errorFunc = (error) => {
      console.error(`Warehouse organization RT error`, error)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'organizations'])
    commit('addTosubscribed', {warehouseOrganizations: unsubscribe})
  },
  async loadWarehouseBillings ({commit, getters}) {
    if (!getters.activeWarehouse) {
      return
    }

    let successFunc = (billingDocs) => {
      let billings = billingDocs.docs.map(doc => {
        let billing = doc.data()
        let key = doc.id
        return {key, ...billing}
      })
      commit('setWarehouseBillings', billings)
    }

    let errorFunc = (error) => {
      console.error(`Warehouse billings RT error`, error)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'billings'])
    commit('addTosubscribed', {warehouseBillings: unsubscribe})
  },
  uploadItems ({commit, getters}, payload) {
    // ***************************************************
    // *********************** Alert *********************
    // Do not sort or filter the upload items in payload
    // ***************************************************
    // ***************************************************
    let allNullfields = payload.items.reduce((sum, item) => {
      let nullFields = getNullFields(item)
      sum = [...sum, ...nullFields]
      return sum
    }, [])
    if (allNullfields.length > 0) {
      let error = `payload contains null value property, upload packages canceled`
      console.error(error)
      return Promise.reject(Error(error))
    }

    Logger.log('uploadItems', payload)
    commit('setLoading', true)
    commit('clearError')

    payload.activeWarehouse = getters.activeWarehouse
    payload.warehouseName = getters.warehouseName
    payload.workerKey = getters.uid
    payload.workerName = getters.userExtra.name
    let items = payload.items.map(item => {
      let {flag, ...itemAttrs} = item
      itemAttrs.unitFee = (getters.upcMap[item.upc] && getters.upcMap[item.upc].unitFee) || 0
      itemAttrs.keywords = item.sku ? [item.upc, item.sku] : [item.upc]
      if (item.snArray && item.snArray.length > 0) (itemAttrs.keywords = [...itemAttrs.keywords, ...item.snArray])
      itemAttrs.keywords = [...itemAttrs.keywords, ...itemAttrs.trackings[0].barcode]
      return itemAttrs
    })
    return dbAccessor.callFunction('uploadPackages', {...payload, items})
      .then((packagesUploaded) => {
        commit('setLoading', false)
        if (packagesUploaded) return packagesUploaded.data
      })
      .catch(error => {
        // tell UI function call failed. No change to payload
        // this could be the network issue which may cause duplicate data
        // commit('setError', error)
        commit('setLoading', false)
        throw error
      })
  },
  updatePackagesInfo ({commit, getters}, payload) {
    let allNullfieldsOld = payload.oldPackages.reduce((sum, item) => {
      let nullFields = getNullFields(item)
      sum = [...sum, ...nullFields]
      return sum
    }, [])
    let allNullfieldsNew = payload.newPackages.reduce((sum, item) => {
      let nullFields = getNullFields(item)
      sum = [...sum, ...nullFields]
      return sum
    }, [])
    if (allNullfieldsOld.length > 0 || allNullfieldsNew.length > 0) {
      let error = `payload contains null value property, update package org id canceled`
      console.error(error)
      return Promise.reject(Error(error))
    }

    Logger.log('updatePackagesInfo', payload)
    commit('setLoading', true)
    commit('clearError')        
    // **********
    // update package to warehouse history
    // **********
    let readPackagePromises = payload.newPackages.map((element) => {
      return dbAccessor.queryStore('warehouses', getters.activeWarehouse, 'packages', element.key)
        .then(doc => {
          let {isConfirmed} = doc.data()
          if (isConfirmed) {
            return {info: 'Package confirmed.', key: element.key}
          } else {
            return null
          }
        })
    })
    return Promise.all(readPackagePromises)
      .then(async (rtnArray) => {
        let confirmedPkgKeys = rtnArray.filter(rtn => (rtn && rtn.info === 'Package confirmed.')).map(rtn => rtn.key)
        let oldPackages = payload.oldPackages.filter(pkg => !confirmedPkgKeys.find(key => key === pkg.key))
        let newPackages = payload.newPackages.filter(pkg => !confirmedPkgKeys.find(key => key === pkg.key))
        // **********
        // prepare to update inventory
        // **********
        // todo: better to update package, old tenant, new tenant in one transaction
        // todo: also need to check whether it is confirmed already, but it is unlikely
        let reversePreviousPromises = updateInventoryPromise(oldPackages, getters.activeWarehouse, getters.warehouseName, '', '', true)
        let updateNewPromises = updateInventoryPromise(newPackages, getters.activeWarehouse, getters.warehouseName)
        // **********
        // remove package from previouse tenant inventory and add to new tenant inventory
        // **********
        
        await Promise.all([...reversePreviousPromises, ...updateNewPromises])

        let updatePackagePromises = newPackages.map((element) => {
          let aPackage = {
            organizationKey: element.organizationKey, 
            modifiedWorkerKey: getters.uid, 
            modifiedWorkerName: getters.userExtra.name, 
            isAddedToInventory: element.isAddedToInventory
          }
          let oldPackage = payload.oldPackages.find(aPkg => aPkg.key === element.key)
          if (oldPackage.upc !== element.upc || 
            oldPackage.quantity !== element.quantity || 
            !deepEqual(oldPackage.snArray, element.snArray)) {
            aPackage.upc = element.upc
            aPackage.quantity = element.quantity
            aPackage.snArray = element.snArray
            aPackage.keywords = element.sku ? [element.upc, element.sku] : [element.upc]
            aPackage.keywords = [...aPackage.keywords, ...element.snArray, ...element.trackings].map(item => item.toUpperCase())
          }
          return dbAccessor.updateFieldsStore(aPackage, 'warehouses', getters.activeWarehouse, 'packages', element.key)
        })
        await Promise.all(updatePackagePromises)

        return {hasConfirmedPkg: confirmedPkgKeys.length !== 0, newPkgs: newPackages}
      })
      .then((rtn) => {
        let logBeforeValue = payload.oldPackages.map(pkg => {
          let logPkg = {...pkg}
          delete logPkg.orgId
          return logPkg
        })
        let logPayload = payload.newPackages.map(pkg => {
          let logPkg = {...pkg}
          delete logPkg.orgId
          return logPkg
        })
        let keywords = new Set([...logBeforeValue, ...logPayload].reduce((acc, pkg) => {
          let {upc, trackings} = pkg
          return upc ? [...acc, upc, ...trackings] : [...acc, ...trackings]
        }, []))
        
        Logger.changeLog({
          beforeValue: logBeforeValue, 
          actionPayload: logPayload,
          actionName: 'updatePackagesInfo',
          categories: ['inventory'],
          keys: payload.oldPackages.map(pkg => pkg.key),
          keywords: [...keywords],
          warehouseKey: getters.activeWarehouse
        })
        commit('setLoading', false)
        if (rtn.hasConfirmedPkg) {
          return rtn.newPkgs
        } else {
          return null
        }
      })
      .catch(error => {
        commit('setError', error)
        commit('setLoading', false)
        throw error
      })
  },
  deletePackage ({commit, getters}, payload) {
    return dbAccessor.runInTransactionStore(async transaction => {
      let pkgDoc = await transaction.get(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse || getters.activeOrganization, 'packages', payload._key]))
      let {createTime} = pkgDoc.data()
      transaction.update(pkgDoc.ref, {originCreateTime: createTime, createTime: dbAccessor.deleteField()})
    })
      .then(() => {
        Logger.changeLog({
          beforeValue: payload.getData(), 
          actionPayload: {key: payload._key},
          actionName: 'deletePackage',
          categories: ['inventory'],
          keys: [payload._key],
          keywords: [payload._key],
          warehouseKey: getters.activeWarehouse
        })
      })
  },
  removePackage ({commit, getters}, payload) {
    let {_key, key} = payload
    let data = payload.getData ? payload.getData() : payload

    if (payload.isAddedToInventory) {
      let targetProduct = getters.productsWithUpcChangeableFlag.find(item => item.upc === payload.upc) || {}
      let targetDist = targetProduct.distribution[`warehouse${targetProduct.id}${Buffer.from(payload.siteName).toString('base64')}`]
      if (!targetProduct || !targetDist || targetDist.quantity - payload.quantity < 0) {
        if (!confirm('The inventory quantity will be negative, do you want to continue?')) return Promise.resolve('cancel')
      }
    }

    return dbAccessor.removeStore('warehouses', getters.activeOrganization, 'packages', _key || key)
      .then(() => {
        if (payload.isAddedToInventory) {
          return updateInventoryPromise([payload], getters.activeOrganization, getters.userExtra.name, '', '', true, true)
        }
        return Promise.resolve()
      })
      .then(() => {
        return Logger.changeLog({
          beforeValue: data, 
          actionPayload: data,
          actionName: 'removePackage',
          categories: ['inventory'],
          keys: [_key || key],
          keywords: [_key || key, payload.organizationKey, ...payload.trackings, payload.upc]
        })
      })
  },
  async addUserToWarehouse ({commit, getters, dispatch}, payload) {
    // is there security risk?
    let predicates = [{
      field: 'email',
      compare: '==',
      value: payload.email
    }]
    let docs = await dbAccessor.queryWithPredicatesStore(predicates, 'users')

    if (docs.size === 0) {
      throw Error('Email address not found.')
    }
    const userDoc = docs.docs[0]
    const {name, warehouses = [], workfor = {}, organizations = []} = userDoc.data()
    if (warehouses.length || JSON.stringify(workfor) !== '{}' || organizations.length) {
      throw Error('Cannot add staff(member) from other organization.')
    }
    return dbAccessor.runInBatch(batch => {
      batch.update(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse]), {
        users: dbAccessor.fieldValue().arrayUnion({
          ...payload,
          name,
          key: userDoc.id
        })
      })
      batch.update(dbAccessor.buildStoreQuery(['users', userDoc.id]), {
        warehouses: [getters.activeWarehouse]
      })
    })
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: payload.roles
        })
      })
  },
  async removeUserFromWarehouse  ({commit, getters, dispatch}, payload) {
    // is there security risk?
    const warehouseRef = dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse])
    const predicates = [
      {
        field: `email`,
        compare: '==',
        value: payload.email
      }
    ]
    const userDocs = await dbAccessor.queryWithPredicatesStore(predicates, 'users')
    const userRef = userDocs.docs[0].ref
    return dbAccessor.runInTransactionStore(async (transaction) => {
      const warehouseDoc = await transaction.get(warehouseRef)

      transaction.update(warehouseRef, {
        users: warehouseDoc.data().users.filter(user => user.email !== payload.email)
      })
      transaction.update(userRef, {
        warehouses: dbAccessor.fieldValue().arrayRemove(getters.activeWarehouse)
      })
    })
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: ['user']
        })
      })
  },
  async editUserForWarehouse  ({commit, getters, dispatch}, payload) {
    // is there security risk?
    const warehouseRef = dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse])
    return dbAccessor.runInTransactionStore(async (transaction) => {
      const warehouseDoc = await transaction.get(warehouseRef)
      let {users} = warehouseDoc.data()
      users.find(user => user.email === payload.email).roles = payload.roles
      transaction.update(warehouseRef, {
        users
      })
    })
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: payload.roles
        })
      })
  },
  addWarehouseAddress ({commit, getters}, payload) {
    return dbAccessor.insertStore(payload, 'warehouses', getters.activeWarehouse, 'sites')
      .then(() => {
        return dbAccessor.callFunction('syncWarehouseAddress', {warehouseKey: getters.activeWarehouse})
      })
      .then(() => {
        console.log('Sync success!')
      }) 
  },
  editWarehouseAddress ({commit, getters}, payload) {
    let key = payload.key
    delete payload.key
    return dbAccessor.updateStore(payload, 'warehouses', getters.activeWarehouse, 'sites', key)
      .then(() => {
        return dbAccessor.callFunction('syncWarehouseAddress', {warehouseKey: getters.activeWarehouse})
      })
      .then(() => {
        console.log('Sync success!')
      }) 
  },
  deleteWarehouseAddress ({commit, getters}, payload) {
    return dbAccessor.removeStore('warehouses', getters.activeWarehouse, 'sites', payload.key)
      .then(() => {
        return dbAccessor.callFunction('syncWarehouseAddress', {warehouseKey: getters.activeWarehouse})
      })
      .then(() => {
        console.log('Sync success!')
      }) 
  },
  loadWarehouseLimitedInfo ({commit, getters}, payload) {
    if (getters.activeWarehouse) {
      return dbAccessor.queryStore('warehouseLimitedInfo', getters.activeWarehouse)
        .then(doc => {
          let limitedInfo
          if (!doc.exists) {
            limitedInfo = {
              warehouseName: getters.userExtra.name,
              orgSettings: {isAcceptNewOrg: true},
              isListed: false
            }
            dbAccessor.updateStore(limitedInfo, 'warehouseLimitedInfo', getters.activeWarehouse)
          } else {
            limitedInfo = doc.data()
            limitedInfo.rates = limitedInfo.rates || {
              packageRates: { inbound: 0, outbound: 0 },
              unitRates: [
                { sortKey: 0, name: 'small', inbound: 0, outbound: 0, storage: 0 },
                { sortKey: 1, name: 'medium', inbound: 0, outbound: 0, storage: 0 },
                { sortKey: 2, name: 'large', inbound: 0, outbound: 0, storage: 0 }
              ]
            }
          }
          commit('setWarehouseLimitedInfo', limitedInfo)
        })
    }
  },
  loadSignupWarehouseRequests ({commit, getters}, payload) {
    if (getters.activeWarehouse) {
      let predicates = [{
        field: 'warehouseKey',
        compare: '==',
        value: getters.activeWarehouse
      }]
      return dbAccessor.queryWithPredicatesStore(predicates, 'joinWarehouseRequests')
        .then(docs => {
          let requests = []
          docs.forEach(doc => { 
            requests.push({
              ...convertTimestampToDateInObj(doc.data()),
              key: doc.id,
              organizationId: ''
            })
          })
          return requests
        })
    }
  },
  loadSignupWarehouseRequestsForTenant ({commit, getters}, payload) {
    if (getters.activeOrganization) {
      let predicates = [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      return dbAccessor.queryWithPredicatesStore(predicates, 'joinWarehouseRequests')
        .then(docs => {
          let requests = []
          docs.forEach(doc => {
            requests.push({
              ...convertTimestampToDateInObj(doc.data()),
              key: doc.id,
              organizationId: ''
            })
          })
          return requests
        })
    }
  },
  async signupWarehouseWithName ({dispatch, getters}, payload) {
    let predicates = [{
      field: 'name',
      compare: '==',
      value: payload
    }]
    let docs = await dbAccessor.queryWithPredicatesStore(predicates, 'warehouses')
    if (docs.size !== 1) {
      throw Error('Warehouse does not exist.')
    }

    let data = docs.docs[0]
    let {users = []} = data.data()
    if (users.some(user => user.name === getters.tenant.name)) throw Error('User has already been accepted by this warehouse.')

    let request = {
      warehouseKey: data.id,
      warehouseName: payload,
      tenantKey: getters.activeOrganization,
      tenantName: getters.tenant.name,
      email: getters.user.email
    }
    return dispatch('signupWarehouse', request)
  },
  async signupWarehouseWithKey ({dispatch, getters}, payload) {
    let doc = await dbAccessor.queryStore('warehouses', payload.warehouseKey)
    if (!doc.exists) throw Error('Warehouse not found.')

    let {users = []} = doc.data()
    if (users.some(user => user.name === getters.tenant.name)) throw Error('User has already been accepted by this warehouse.')
    
    let request = {
      warehouseKey: doc.id,
      warehouseName: payload.warehouseName,
      tenantKey: getters.activeOrganization,
      tenantName: getters.tenant.name,
      email: getters.user.email
    }
    return dispatch('signupWarehouse', request)
  },
  signupWarehouse ({commit, getters}, payload) {
    let {warehouseKey, warehouseName} = payload
    let request = {
      warehouseKey,
      warehouseName,
      tenantKey: getters.activeOrganization,
      tenantName: getters.tenant.name,
      email: getters.user.email
    }
    let predicates = [{
      field: 'warehouseKey',
      compare: '==',
      value: warehouseKey
    },
    {
      field: 'tenantKey',
      compare: '==',
      value: getters.activeOrganization
    }]
    return dbAccessor.queryWithPredicatesStore(predicates, 'joinWarehouseRequests')
      .then(docs => {
        if (docs.size === 0) {
          return dbAccessor.insertStore(request, 'joinWarehouseRequests')
            .then(docRef => {
              return {...request, key: docRef.id}
            })
        }
      })
  },
  async getWarehouseInventory ({commit, getters}, payload) {
    let {isAll, siteKey} = payload
    const predicates = [{
      field: 'siteKey',
      compare: '==',
      value: siteKey
    }]
    let docsArray = isAll ? 
      await dbAccessor.queryWithPredicatesStore(predicates, 'warehouses', getters.activeWarehouse, 'inventory') : 
      await Promise.all(payload.tenantKeys.map(key => dbAccessor.queryStore('warehouses', getters.activeWarehouse, 'inventory', `${siteKey}_${key}`)))
    let products = {}
    docsArray.forEach(item => {
      if (item.exists) {
        let {abnormalDistribution = {}, distribution, tenantKey} = item.data()
        const upcSet = new Set([...Object.keys(distribution), ...Object.keys(abnormalDistribution)])
        upcSet.forEach(upc => {
          let quantity = distribution[upc] || 0
          let abnormalQty = abnormalDistribution[upc] || 0
          let productName = getters.getUpcName(upc) || 'New product'
          if (products[upc]) {
            if (quantity) products[upc].quantity += quantity
            if (abnormalQty) products[upc].abnormalQty += abnormalQty

            if (products[upc]['distribution'] && products[upc]['distribution'][tenantKey]) {
              products[upc]['distribution'][tenantKey].quantity = (products[upc]['distribution'][tenantKey].quantity || 0) + quantity
              products[upc]['distribution'][tenantKey].abnormalQty = (products[upc]['distribution'][tenantKey].abnormalQty || 0) + quantity
            } else if (products[upc]['distribution'] && !products[upc]['distribution'][tenantKey]) {
              products[upc]['distribution'][tenantKey] = {quantity, abnormalQty}
            } else {
              products[upc]['distribution'] = {[tenantKey]: {quantity, abnormalQty}}
            }
          } else {
            products[upc] = {
              upc,
              quantity,
              abnormalQty,
              productName, 
              distribution: {[tenantKey]: {quantity, abnormalQty}}
            }
          }        
        })
      }
    })
    return Object.values(products)
  },
  async willChangeCauseNegativeInventory ({commit, getters}, payload) {
    let {newPackages, oldPackages} = payload
    let newPkgMap = {}    
    let oldPkgMap = {}

    newPackages.forEach((newPkg, index) => {
      if (newPkg.organizationKey) {
        let newKey = newPkg.organizationKey + '_' + newPkg.upc
        if (!newPkgMap[newKey]) {
          newPkgMap[newKey] = newPkg.quantity
        } else {
          newPkgMap[newKey] += newPkg.quantity
        }
      }

      if (oldPackages[index].organizationKey) {
        let oldKey = oldPackages[index].organizationKey + '_' + oldPackages[index].upc
        if (!oldPkgMap[oldKey]) {
          oldPkgMap[oldKey] = oldPackages[index].quantity
        } else {
          oldPkgMap[oldKey] += oldPackages[index].quantity
        }
      }
    })

    Object.keys(oldPkgMap).forEach(key => {
      if (!newPkgMap[key]) {
        newPkgMap[key] = -oldPkgMap[key]
      } else {
        newPkgMap[key] -= oldPkgMap[key]
      }
    })

    let pkgMapDiff = newPkgMap
    let promises = Object.keys(pkgMapDiff).map(async key => {
      if (pkgMapDiff[key] < 0) {
        let [organizationKey, upc] = key.split('_')
        return dbAccessor.queryWithPredicatesStore([{field: 'upc', compare: '==', value: upc}], 'tenants', organizationKey, 'inventory')
      }
      return Promise.resolve(false)
    })

    let rtns = await Promise.all(promises)
    return Object.keys(pkgMapDiff).filter((key, index) => {
      if (pkgMapDiff[key] < 0) {
        let inventoryDocs = rtns[index]
        if (inventoryDocs.size > 0) {
          let {quantity} = inventoryDocs.docs[0].data()
          let inventoryQty = quantity
          return inventoryQty + pkgMapDiff[key] < 0
        }
      }
      return false
    })
  },
  updateBillingRates ({commit, getters, dispatch}, payload) {
    let beforeValue = {...getters.warehouseLimitedInfo.rates}
    return dbAccessor.updateFieldsStore({rates: payload, hasRates: true}, 'warehouseLimitedInfo', getters.activeWarehouse)
      .then(() => {
        Logger.changeLog({
          beforeValue,
          actionPayload: payload,
          actionName: 'updateBillingRates',
          categories: ['balance', 'userInfo'],
          keys: [getters.activeWarehouse]
        })
      })
      .then(() => {
        return dispatch('loadWarehouseLimitedInfo')
      })
  },
  updateBillingOtherRates ({commit, getters, dispatch}, payload) {
    let beforeValue = {...getters.warehouseLimitedInfo.otherRates}
    return dbAccessor.updateFieldsStore({otherRates: payload, hasRates: true}, 'warehouseLimitedInfo', getters.activeWarehouse)
      .then(() => {
        Logger.changeLog({
          beforeValue,
          actionPayload: payload,
          actionName: 'updateBillingOtherRates',
          categories: ['balance', 'userInfo'],
          keys: [getters.activeWarehouse]
        })
      })
      .then(() => {
        return dispatch('loadWarehouseLimitedInfo')
      })
  },
  async editTierDiscount ({commit, getters, dispatch}, payload) {
    let beforeValue
    let {isDelete, key, ...restPayload} = payload
    let tierDiscounts = {...getters.warehouseLimitedInfo.tierDiscounts}
    if (isDelete) {
      beforeValue = {...tierDiscounts[key]}
      delete tierDiscounts[key]
    } else {
      if (key) {
        beforeValue = {...tierDiscounts[key]}
        delete tierDiscounts[key]
      } else {
        beforeValue = {}
        key = await dbAccessor.getNewDocumentKey('warehouseLimitedInfo').id
      }
      if (tierDiscounts) {
        tierDiscounts[key] = restPayload
      } else {
        tierDiscounts = {[key]: restPayload}
      }
    }
    let predicates = [{
      field: 'discountKey',
      compare: '==',
      value: key
    }]
    let organizationDocs = await dbAccessor.queryWithPredicatesStore(predicates, 'warehouses', getters.activeWarehouse, 'organizations')
    return dbAccessor.runInBatch(batch => {
      batch.update(dbAccessor.buildStoreQuery(['warehouseLimitedInfo', getters.activeWarehouse]), dbAccessor.addUpdateDocTimestamp({tierDiscounts}))
      organizationDocs.forEach(doc => {
        if (!isDelete) {
          batch.update(doc.ref, dbAccessor.addUpdateDocTimestamp({discountRate: payload.discountRate}))
        } else {
          batch.update(doc.ref, dbAccessor.addUpdateDocTimestamp({discountRate: null, discountKey: null}))
        }
      })
    })
      .then(() => {
        Logger.changeLog({
          beforeValue,
          actionPayload: payload,
          actionName: 'editTierDiscount',
          categories: ['balance', 'userInfo'],
          keys: [getters.activeWarehouse]
        })
      })
      .then(() => {
        return dispatch('loadWarehouseLimitedInfo')
      })
  },
  getWarehouseTransactionsPagination ({commit, getters}, payload) {
    let {transactionType, startDate, endDate, limit, startAfter} = payload
    let predicates
    if (getters.activeOrganization) {
      predicates = [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
    }
    if (getters.activeWarehouse) {
      predicates = [{
        field: 'warehouseKey',
        compare: '==',
        value: getters.activeWarehouse
      }]
    }

    if (transactionType) {
      predicates.push({
        field: 'transactionType',
        compare: '==',
        value: transactionType
      })
    }

    if (startDate) {
      predicates.push({
        field: `createTime`,
        compare: '>=',
        value: startDate
      })
    }

    if (endDate) {
      predicates.push({
        field: `createTime`,
        compare: '<=',
        value: endDate
      })
    }

    if (payload && payload.predicates && payload.predicates.actionPredicates) {
      predicates = [...predicates, ...payload.predicates.actionPredicates]
    }

    if (payload.predicates && payload.predicates.predicateSelect) {
      predicates.push({
        field: `transactionType`,
        compare: '==',
        value: payload.predicates.predicateSelect
      })
    }
    return dbAccessor.queryWithPagination(predicates, ['warehouseTransactions'], 'createTime', true, startAfter, limit)
  },
  getSystemTransactionsPagination ({commit, getters}, payload) {
    let {startDate, endDate, limit, startAfter} = payload
    let predicates = []

    if (startDate) {
      predicates.push({
        field: `createTime`,
        compare: '>=',
        value: startDate
      })
    }

    if (endDate) {
      predicates.push({
        field: `createTime`,
        compare: '<=',
        value: endDate
      })
    }

    if (payload.predicates && payload.predicates.predicateSelect) {
      if (payload.predicates.predicateSelect === 'fee') {
        predicates.push({
          field: `type`,
          compare: '==',
          value: 'label'
        })
      } else {
        predicates.push({
          field: `type`,
          compare: '==',
          value: payload.predicates.predicateSelect
        })
      }
    }

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: 'keywords',
        compare: 'array-contains',
        value: payload.predicates.predicateText
      })
    }

    if (payload && payload.predicates && payload.predicates.actionPredicates) {
      predicates = [...predicates, ...payload.predicates.actionPredicates]
    }
    
    return dbAccessor.queryWithPagination(predicates, ['systemTransactions'], 'createTime', true, startAfter, limit)
  },
  async adjustWarehouseBalance ({commit, getters}, payload) {
    Logger.log('adjustWarehouseBalance', payload)
    let {note, amount, type, tenantKey} = payload
    const operator = (getters.user && getters.user.displayName) || 'root admin'
    if (typeof amount !== 'number' || Number.isNaN(amount)) throw Error('amount-type-error')
    if (amount === 0) return Promise.resolve() 
    let newBalance
    let transactionLog = {
      note, 
      transactionType: type, 
      tenantKey, 
      warehouseKey: getters.activeWarehouse,
      workerKey: getters.userExtra.uid,
      workerName: getters.userExtra.name,
      operator
    }
    let rtn = await dbAccessor.callFunction('getServerTime', {})
    let currentTime = new Date(rtn.data)
    let curKeyStr = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}`

    if (type === 'adjust') {
      return dbAccessor.runInTransactionStore(async transaction => {
        let transactionLogRef = dbAccessor.getNewDocumentKey('warehouseTransactions')
        let billingDoc = await transaction.get(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'billings', `${getters.activeWarehouse}_${tenantKey}`]))
        let {balance = 0} = billingDoc.data() || {}
        newBalance = balance + amount
        if (billingDoc.exists) transaction.update(billingDoc.ref, dbAccessor.addUpdateDocTimestamp({balance: toMoney(newBalance), tenantKey}))
        else {
          transaction.set(billingDoc.ref, dbAccessor.addUpdateDocTimestamp({
            balance: toMoney(newBalance), 
            tenantKey, 
            expenseHistory: []
          }))
        }
        transactionLog.newBalance = toMoney(newBalance)
        transactionLog.amount = amount
        transaction.set(transactionLogRef, dbAccessor.addNewDocTimestamp(transactionLog))
      })
    } else if (type === 'fee') {
      return dbAccessor.runInTransactionStore(async transaction => {
        let transactionLogRef = dbAccessor.getNewDocumentKey('warehouseTransactions')
        let billingDoc = await transaction.get(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'billings', `${getters.activeWarehouse}_${tenantKey}`]))
        
        let {balance = 0, expenseHistory = []} = billingDoc.data() || {}
        let billingUpdate
        let balanceDiff = amount
        newBalance = addNumbers(balance, balanceDiff)
        if (expenseHistory) {
          let tailMonth = expenseHistory[expenseHistory.length - 1]
          if (tailMonth && curKeyStr === tailMonth.dateKeyStr) {
            tailMonth.expense = addNumbers(-balanceDiff, tailMonth.expense || 0)
          } else {
            expenseHistory.push({
              dateKeyStr: curKeyStr,
              expense: toMoney(-balanceDiff)
            })
          }
    
          if (expenseHistory.length > 12) {
            expenseHistory.shift()
          }
          billingUpdate = {balance: newBalance, expenseHistory, tenantKey}
        } else {
          billingUpdate = {
            tenantKey,
            balance: newBalance,
            expenseHistory: [{
              dateKeyStr: curKeyStr,
              expense: -balanceDiff
            }]
          }
        }
        if (billingDoc.exists) transaction.update(billingDoc.ref, dbAccessor.addUpdateDocTimestamp(billingUpdate))
        else transaction.set(billingDoc.ref, dbAccessor.addNewDocTimestamp(billingUpdate))
        transactionLog.newBalance = newBalance
        transactionLog.amount = amount
        transaction.set(transactionLogRef, dbAccessor.addNewDocTimestamp({...transactionLog, subtype: 'other service'}))
      })
    }
  },
  loadSettingPromotions ({commit, getters}) {
    return dbAccessor.queryStore('warehouses', getters.activeWarehouse, 'promotions')
      .then((promotionDocs) => {
        if (promotionDocs.docs.length <= 0) {
          commit('setSettingPromotions', [])
          return
        }

        let promotions = promotionDocs.docs.map((promotionDoc) => {
          return { ...convertTimestampToDateInObj(promotionDoc.data()), key: promotionDoc.id }
        })
        commit('setSettingPromotions', [...promotions])
      })
  },
  insertSettingPromotion ({commit, getters, dispatch}, payload) {
    return dbAccessor.insertStore(payload, 'warehouses', getters.activeWarehouse, 'promotions')
      .then((res) => commit('setSettingPromotions', [...getters.settingPromotions, {key: res.id, ...payload}]))
  },
  updateSettingPromotion ({commit, getters, dispatch}, payload) {
    let { key } = payload
    if (!key) return 
    
    let promotions = [...getters.settingPromotions]
    let findIndex = promotions.findIndex(promotion => promotion.key === key)

    /**
     * @todo do deep compare with payload & old promotion,
     *   if promotion has been changed, clear this read list and commit this promotion to db
     */
    delete payload.readList
    promotions[findIndex] = {...payload}
    delete payload.key
    return dbAccessor.updateStore(payload, 'warehouses', getters.activeWarehouse, 'promotions', key)
      .then(() => commit('setSettingPromotions', promotions))
  },
  deleteSettingPromotion ({commit, getters}, payload) {
    let { key } = payload
    if (!key) return 
    let promotions = [...getters.settingPromotions].filter(promotion => promotion.key !== key)

    return dbAccessor.removeStore('warehouses', getters.activeWarehouse, 'promotions', key)
      .then(res => commit('setSettingPromotions', promotions)) 
  },
  getWarehouseAnnouncements ({commit, getters}) {
    const cbFunc = (data) => {
      commit('setWarehouseAnnouncements', data)
    }
    let unsubscribe = Announcement.getByWarehouseRT(cbFunc, getters.activeWarehouse)
    commit('addTosubscribed', {warehouseAnnouncements: unsubscribe})
  },
  addPackageReportWarehouse ({commit, getters}, payload) {
    let report = new PackageReportWarehouse(payload, getters.activeWarehouse)
    return report.insert()
  },
  deletePackageReportWarehouse ({commit, getters}, payload) {
    let report = new PackageReportWarehouse(payload, getters.activeWarehouse)
    return report.delete()
  },
  loadPackageReportsWarehouse ({commit, getters}) {
    const cbFunc = (data) => {
      commit('setPackageReports', data)
    }
    let unsubscribe = PackageReportWarehouse.getRT(cbFunc, getters.activeWarehouse, [])
    commit('addTosubscribed', {packageReports: unsubscribe})
  },
  async checkWarehouseDistribution ({dispatch}, {key}) {
    return dispatch('getWarehouseInventory', {siteKey: key, isAll: true})
      .then(products => !!products.length)
  },
  getChangeLogs ({commit, getters}, payload) {
    let {limit, startAfter} = payload
    let predicates = [{
      field: `actionName`,
      compare: '==',
      value: 'updatePackagesInfo'
    }, {
      field: 'warehouseKey',
      compare: '==',
      value: getters.activeWarehouse
    }]

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: 'keywords',
        compare: 'array-contains',
        value: payload.predicates.predicateText
      })
    }
    return dbAccessor.queryWithPagination(predicates, ['changeLogs'], 'createTime', true, startAfter, limit)
  },
  getAbnormalPackages ({dispatch, commit, getters}, payload) {
    const cbFunc = (packages) => {
      if (packages.length) {
        dispatch('addNotification', {
          key: 'newAbnormalPackages',
          displayName: 'abnormal packages',
          pathName: 'abnormal package',
          path: '/package?tab=abnormalPackages'
        })
      } else commit('removeNotification', {key: 'newAbnormalPackages'})
      commit('setAbnormalPackages', packages)
    }

    if (getters.activeOrganization) {
      let unsubscribe = Package.getAbnormalPkgsGroupRTByTenantKey(
        cbFunc, getters.activeOrganization, getters.uid
      )
      commit('addTosubscribed', {tenantAbnormalPackages: unsubscribe})
    } else if (getters.activeWarehouse) {
      let unsubscribe = Package.getAbnormalPkgsRTByWarehouseKey(
        cbFunc, getters.activeWarehouse, getters.uid
      )
      commit('addTosubscribed', {warehouseAbnormalPackages: unsubscribe})
    }
  },
  async resolveAbnormalPackage ({commit, getters}, payload) {
    if (!payload.key) throw Error('cannot-find-package')
    const warehouseKey = getters.activeWarehouse
    const {acceptedQty = 0, returnQty = 0, key = '', oldPackage = {}, note = ''} = payload
    const {upc, warehouseSite, organizationKey} = oldPackage
    const warehouseInventoryRef = dbAccessor.buildStoreQuery(['warehouses', warehouseKey, 'inventory', `${warehouseSite}_${organizationKey}`])
    const tenantProductDocs = await dbAccessor.queryWithPredicatesStore(
      [{field: 'upc', compare: '==', value: upc}], 
      'tenants', organizationKey, 'inventory'
    )

    let tenantProductDoc
    let logBeforeValue, logPayload

    if (tenantProductDocs.size) {
      tenantProductDoc = tenantProductDocs.docs[0]
    }
    return Package.startTransaction(async transaction => {
      const warehouseInventory = await transaction.get(warehouseInventoryRef)
      const {
        abnormalDistribution: originAbnormalDistribution = {}, 
        distribution: originDistribution = {}
      } = warehouseInventory.data()
      let curPackage = await Package.getT(transaction, warehouseKey, key)
      if (!curPackage.isAbnormal) throw Error('package-has-been-resolved')
      const pkgOriginQty = curPackage.quantity
      let isTenantNewDistribution = false
      let tenantProductDistribution = {quantity: 0}
      let siteMapName
      let product

      logBeforeValue = curPackage.getData()

      if (tenantProductDoc) {
        product = tenantProductDoc.data()
        const {distribution: productDistribution = {}} = product
        siteMapName = `warehouse${product.id}${warehouseSite}`
        if (productDistribution[siteMapName]) {
          tenantProductDistribution.quantity = productDistribution[siteMapName].quantity
          tenantProductDistribution.quantity += acceptedQty
        } else {
          isTenantNewDistribution = true
          tenantProductDistribution = {
            quantity: acceptedQty,
            siteName: curPackage.siteName,
            uid: warehouseKey,
            userName: getters.userExtra.name,
            warehouseKey: warehouseKey,
            warehouseSite: warehouseSite
          }
        }
      }
      
      curPackage.returnQty = returnQty
      curPackage.quantity = acceptedQty
      curPackage.resolveNote = note
      curPackage.isAbnormal = false
      
      // start update
      let distribution = {...originDistribution}
      let abnormalDistribution = {...originAbnormalDistribution}
      
      distribution[upc] = (originDistribution[upc] || 0) + acceptedQty

      // if acceptQty = 0, no need to update inventory
      if (acceptedQty && tenantProductDoc) {
        if (isTenantNewDistribution) {
          transaction.update(tenantProductDoc.ref, {
            [`distribution.${siteMapName}`]: tenantProductDistribution,
            inbound: (product.inbound || 0) + acceptedQty,
            quantity: (product.quantity || 0) + acceptedQty
          }) 
        } else {
          transaction.update(tenantProductDoc.ref, { 
            [`distribution.${siteMapName}.quantity`]: tenantProductDistribution.quantity,
            inbound: (product.inbound || 0) + acceptedQty,
            quantity: (product.quantity || 0) + acceptedQty
          })
        }
        curPackage.isAddedToInventory = true
        curPackage.addedToInventoryTime = new Date()
      }
      curPackage.updateT(transaction)
      logPayload = curPackage.getData()
      
      // update inventory
      // if acceptQty = 0, no need to update distribution
      if (originAbnormalDistribution[upc] && (originAbnormalDistribution[upc] - pkgOriginQty > 0)) {
        abnormalDistribution[upc] = (originAbnormalDistribution[upc] - pkgOriginQty)
      } else {
        delete abnormalDistribution[upc]
      }
      transaction.update(warehouseInventoryRef, dbAccessor.addUpdateDocTimestamp({
        distribution, abnormalDistribution
      }))
      return {
        originAbnormalDistribution,
        originDistribution,
        abnormalDistribution,
        distribution
      }
    })
      .then(({
        originAbnormalDistribution,
        originDistribution,
        abnormalDistribution,
        distribution
      }) => {
        // change log
        let keywords = new Set([upc, ...logBeforeValue.trackings, ...logPayload.trackings])
        Logger.changeLog({
          beforeValue: [logBeforeValue, {originAbnormalDistribution, originDistribution}], 
          actionPayload: [logPayload, {abnormalDistribution, distribution}],
          actionName: 'resolvePackage',
          categories: ['inventory'],
          keys: [key],
          keywords: [...keywords],
          warehouseKey: getters.activeWarehouse
        })
      })
  },
  getAdjustLogs ({commit, getters}, payload) {
    let {limit, startAfter} = payload
    let predicates = [{
      field: `actionName`,
      compare: '==',
      value: 'adjustInventory'
    }, {
      field: 'warehouseKey',
      compare: '==',
      value: getters.activeWarehouse
    }]

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: 'keywords',
        compare: 'array-contains',
        value: payload.predicates.predicateText
      })
    }
    return dbAccessor.queryWithPagination(predicates, ['changeLogs'], 'createTime', true, startAfter, limit)
  },
  async adjustInventory ({commit, getters}, payload) {
    let {upc, quantity, note, from, to, warehouseSite} = payload
    let predicates = [{
      field: 'upc',
      compare: '==',
      value: upc
    }]
    let toInventoryDocs = await dbAccessor.queryWithPredicatesStore(predicates, 'tenants', to.key, 'inventory')
    let fromInventoryDocs = await dbAccessor.queryWithPredicatesStore(predicates, 'tenants', from.key, 'inventory')

    if (toInventoryDocs.size !== 1) {
      throw Error(`Organization(${to.organizationId}) has not defined this prodcut.`)
    }

    if (fromInventoryDocs.size !== 1) {
      throw Error(`Organization(${from.organizationId}) has not defined this prodcut.`)
    }
    
    const beforeSnapshot = {
      fromQty: fromInventoryDocs.docs[0].data().distribution ? (fromInventoryDocs.docs[0].data().distribution[`warehouse${fromInventoryDocs.docs[0].id}${warehouseSite.key}`].quantity || 0) : 0,
      toQty: toInventoryDocs.docs[0].data().distribution ? (toInventoryDocs.docs[0].data().distribution[`warehouse${toInventoryDocs.docs[0].id}${warehouseSite.key}`].quantity || 0) : 0
    }

    let oldPackages = [{
      upc,
      organizationKey: from.key,
      quantity,
      warehouseSite: warehouseSite.key,
      siteName: warehouseSite.siteName,
      isAddedToInventory: true
    }]

    let newPackages = [{
      upc,
      organizationKey: to.key,
      quantity,
      warehouseSite: warehouseSite.key,
      siteName: warehouseSite.siteName,
      isAddedToInventory: true
    }]

    let reversePreviousPromises = updateInventoryPromise(oldPackages, getters.activeWarehouse, getters.warehouseName, '', '', true)
    let updateNewPromises = updateInventoryPromise(newPackages, getters.activeWarehouse, getters.warehouseName)
    
    return Promise.all([reversePreviousPromises, updateNewPromises])
      .then(() => {
        Logger.changeLog({
          beforeSnapshot,
          beforeValue: [{...oldPackages[0], quantity: -quantity}], 
          actionPayload: newPackages,
          actionName: 'adjustInventory',
          categories: ['inventory'],
          keys: [],
          keywords: [upc, quantity, from.key, to.key, warehouseSite.key],
          warehouseKey: getters.activeWarehouse,
          note
        })
      })        
      .catch(error => {
        commit('setError', error)
        commit('setLoading', false)
        throw error
      })
  },
  /** @param {{ 
    *   key, 
    *   change: {
    *     isChange: Boolean,
    *     _old:{quantity?, abnormalQty?, normalQty?, note?, organizationKey?},
    *     _cur:{quantity?, abnormalQty?, normalQty?, note?, organizationKey?}
    *   },
    *   logPayload: Object
    * }} payload
    */
  updateAbnormalPackage ({commit, getters}, payload) {
    const {activeWarehouse} = getters
    const {change} = payload
    if (!change.isChange) return change
    let {organizationKey = '', note = '', quantity = 0, abnormalQty = 0, normalQty = 0} = change._new

    return Package.startTransaction(async (transaction) => {
      // this transaction will definitely change pkg doc
      let curPackage = await Package.getT(transaction, activeWarehouse, payload.key)
      const {warehouseSite, upc} = curPackage
      const beforeValue = curPackage.getData()
      const newPackage = {
        organizationKey,
        abnormalQty,
        normalQty,
        quantity,
        note
      }

      const calculateDiffs = () => {
        let map = {}
        if (organizationKey) {
          // init based on new
          map[organizationKey] = map[organizationKey] || {
            abnormalDiff: 0,
            normalDiff: 0
          }
          map[organizationKey].abnormalDiff += abnormalQty
          map[organizationKey].normalDiff += normalQty
        }
        if (curPackage.organizationKey) {
          // init based on old
          map[curPackage.organizationKey] = map[curPackage.organizationKey] || {
            abnormalDiff: 0,
            normalDiff: 0
          }
          map[curPackage.organizationKey].abnormalDiff -= curPackage.abnormalQty
          map[curPackage.organizationKey].normalDiff -= curPackage.normalQty
        }
        return map
      }
      let inventoryDiffMap = calculateDiffs()

      let transactionUpdates = {}
      await Promise.all(Object.keys(inventoryDiffMap).map(async organizationKey => {
        const {abnormalDiff, normalDiff} = inventoryDiffMap[organizationKey]
        if (abnormalDiff || normalDiff) {
          const inventoryDoc = await transaction.get(dbAccessor.buildStoreQuery([
            'warehouses', activeWarehouse, 'inventory', 
            warehouseSite + '_' + organizationKey
          ]))

          if (inventoryDoc.exists) {
            const {distribution = {}, abnormalDistribution = {}} = inventoryDoc.data()
            distribution[upc] = normalDiff + (distribution[upc] || 0)
            if (distribution[upc] === 0) delete distribution[upc]
            abnormalDistribution[upc] = abnormalDiff + (abnormalDistribution[upc] || 0)
            if (abnormalDistribution[upc] === 0) delete distribution[upc]
            
            transactionUpdates[organizationKey] = {
              distribution,
              abnormalDistribution,
              ref: inventoryDoc.ref,
              isNewDoc: false
            }
          } else {
            transactionUpdates[organizationKey] = {
              tenantKey: organizationKey,
              siteKey: warehouseSite,
              abnormalDistribution: {},
              distribution: {},
              isNewDoc: true
            }

            if (abnormalDiff) {
              transactionUpdates[organizationKey].abnormalDistribution = {
                [upc]: abnormalDiff
              }
            }
            
            if (normalDiff) {
              transactionUpdates[organizationKey].distribution = {
                [upc]: normalDiff
              }
            }
          }
        }
      }))
      
      Object.keys(transactionUpdates).forEach(organizationKey => {
        const updateInfo = transactionUpdates[organizationKey]
        const {distribution, abnormalDistribution, ref, isNewDoc, tenantKey, siteKey} = updateInfo

        if (isNewDoc) {
          transaction.set(ref, dbAccessor.addNewDocTimestamp({
            distribution, 
            abnormalDistribution,
            tenantKey, 
            siteKey
          }))
        } else {
          transaction.update(ref, dbAccessor.addUpdateDocTimestamp({distribution, abnormalDistribution}))
        }
      })

      Object.assign(curPackage, newPackage)
      curPackage.updateT(transaction)
      return {upc, key: payload.key, logBeforeValue: beforeValue, logPayload: payload.logPayload}
    })
      .then(({upc, key, logBeforeValue, logPayload}) => {
        // change log
        if (!payload.change.isChange) return
        let keywords = new Set([upc, ...logBeforeValue.trackings, ...logPayload.newPackage.trackings])
        const logValue = {
          beforeValue: [logBeforeValue], 
          actionPayload: [logPayload.newPackage],
          actionName: 'updatePackagesInfo',
          categories: ['inventory'],
          keys: [key],
          keywords: [...keywords],
          warehouseKey: getters.activeWarehouse
        }
        Logger.changeLog(logValue)
        return payload
      })
  },
  /**
   * @param {{
   *  [Orgkey: String]: {
   *    [upc: String]: number,
   *    pkg: number,
   *    unit: number
   *  }
   * }} payload
   */
  updatePackageAdjustBalanceRecommendations ({getters}, payload) {
    let recommendations = {}
    const discountMap = new Map(getters.tenantsWithBillings.map(item => {
      let {key, waives, discountRate} = item
      return [key, {waives, discountRate}]
    }))

    const {packageRates, unitRates} = getters.warehouseLimitedInfo.rates
    const inPackageFee = packageRates.inbound
    const size2InRateMap = new Map([
      ...unitRates.map(item => [item.name, item.inbound]),
      ...unitRates.map(item => [item.sortKey, item.inbound]),
      ['custom', 0]
    ])
    const size2StorageRateMap = new Map([
      ...unitRates.map(item => [item.name, item.storage]),
      ...unitRates.map(item => [item.sortKey, item.storage]),
      ['custom', 0]
    ])

    Object.keys(payload).map(orgKey => {
      let storageFee = 0
      let inboundFee = 0
      let {discountRate = 0, waives = []} = discountMap.get(orgKey) || {}
      let waivesSet = new Set(waives)
      Object.keys(payload[orgKey]).forEach((upc) => {
        if (upc !== 'pkg' &&
          upc !== 'unit' &&
          !waivesSet.has('storage') &&
          getters.upcMap[upc] !== undefined &&
          getters.upcMap[upc].size !== 'custom') {
          const size = getters.upcMap[upc].size
          storageFee += size2StorageRateMap.get(size) * payload[orgKey][upc]
          if (!waivesSet.has('inbound')) {
            inboundFee += size2InRateMap.get(size) * payload[orgKey].unit[upc]
          }
        }
      })

      if (!waivesSet.has('inbound')) {
        inboundFee += inPackageFee * payload[orgKey].pkg
      }
      
      recommendations[orgKey] = {
        storageFee: -toMoney(storageFee),
        inboundFee: -toMoney(inboundFee),
        waives,
        discountRate,
        total: -toMoney((storageFee + inboundFee) * (100 - discountRate) / 100)
      }
    })
    return Object.keys(recommendations).map(key => {
      return {organizationKey: key, organizationId: getters.organizationKeyToId.get(key), ...recommendations[key]}
    })
  },
  async getWarehouseStat ({commit, getters}, payload) {
    let predicates = [{
      field: 'warehouseKey',
      compare: '==',
      value: getters.activeWarehouse
    }]

    const statDocs = await dbAccessor.queryWithPredicatesStore(predicates, 'warehouses', getters.activeWarehouse, 'statistics')
    let statistics = {}
    statDocs.docs.forEach(doc => {
      statistics[doc.id] = doc.data()
    })
    commit('setStatistics', statistics)
  },
  /** @param {{key: string}} payload */
  removeOrgWarehouseRequest ({commit, getters}, payload) {
    if (payload && payload.key) return dbAccessor.removeStore('joinWarehouseRequests', payload.key)
  },
  /**
   * @param {{
   *  approved: {
   *    template: string,
   *    attachments: Array<{
   *      fullPath: string,
   *      name: string
   *    }>
   *  },
   *  rejected: {
   *    template: string,
   *  } 
   * }} payload
   */
  setEmailTemplates ({commit, dispatch, getters}, payload) {
    return dbAccessor.updateFieldsStore({emailTemplates: payload},
      'warehouseLimitedInfo', getters.activeWarehouse
    ).then(() => dispatch('loadWarehouseLimitedInfo'))
  },
  /**
   * 
   * @param {{
   *  subject: string,
   *  body: {template: string, variables: {[key: string]: string}, attachments: []},
   *  recievers: Array<string>
   * }} payload email object
   */
  async sendMail ({commit, getters}, payload) {
    const body = new EmailBodyBuilder(
      payload.body.template,
      payload.body.variables,
      payload.body.attachments || []).toEmail()
    return dbAccessor.callFunction('sendMail', {...payload, body})
  },
  /** save Warehouse's organization settings **/
  async saveOrgSettingsChange ({commit, dispatch, getters}, payload) {
    const {warehouseOrgSettings = {}} = getters
    let newSettings = {...warehouseOrgSettings, ...(payload || {})}
    return dbAccessor.updateFieldsStore(
      dbAccessor.addUpdateDocTimestamp({
        orgSettings: newSettings
      }), 
      'warehouseLimitedInfo', getters.activeWarehouse
    )
      .then(() => {
        return dispatch('loadWarehouseLimitedInfo')
      })
  },
  async updateWarehouseLimitedInfo ({commit, getters}, payload) {
    return dbAccessor.updateFieldsStore(dbAccessor.addUpdateDocTimestamp({
      isListed: payload
    }), 
    'warehouseLimitedInfo', getters.activeWarehouse)
      .then(() => {
        commit('setWarehouseListed', payload)
      })
  },
  // updateTempSku ({commit, getters}, payload) {
  //   const {sku, description, size, unitFee, organizationKey} = payload
  //   return dbAccessor.updateStore({
  //     sku,
  //     description, 
  //     size, 
  //     unitFee, 
  //     organizationKey,
  //     isSku: true
  //   }, 'warehouses', getters.activeWarehouse, 'upcs', `${organizationKey}_${sku}`)
  // },
  // deleteTempSku ({commit, getters}, payload) {
  //   const {sku, organizationKey} = payload
  //   return dbAccessor.removeStore('warehouses', getters.activeWarehouse, 'upcs', `${organizationKey}_${sku}`)
  // },
  async acceptSkuRequest ({commit, getters}, payload) {
    await dbAccessor.callFunction('acceptSkuRequest', payload)
    if (!getters.skuRequests.length || !getters.skuRequests.filter(item => item.key !== payload.key).length) {
      commit('removeNotification', {key: 'newSkuRequests'})
    }
  },
  getHistoryScannedItems ({commit, getters}, payload) {
    let predicates = []

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: `trackings`,
        compare: 'array-contains',
        value: payload.predicates.predicateText.toUpperCase()
      })
    }

    if (payload && payload.predicates && payload.predicates.actionPredicates) {
      predicates = [...predicates, ...payload.predicates.actionPredicates]
    }

    payload.startDate && payload.endDate && (predicates = [...predicates, {
      field: `createTime`,
      compare: '>=',
      value: payload.startDate
    },
    {
      field: `createTime`,
      compare: '<=',
      value: payload.endDate
    }])

    return dbAccessor.queryWithPagination(predicates, ['warehouses', getters.activeWarehouse, 'scannedTrackings'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  uploadScannedTrackings ({commit, getters}, payload) {
    const inboundTrackingSet = new Set(getters.inboundTrackingCache)
    const {trackings, type, carrier, uploadedFiles, serviceType, note} = payload

    return dbAccessor.updateStore({
      trackings,
      uploadedTrackings: trackings.filter(item => inboundTrackingSet.has(item)),
      carrier,
      type,
      serviceType,
      note,
      uploadedFiles,
      workerKey: getters.uid,
      workerName: getters.userExtra.name
    }, 'warehouses', getters.activeWarehouse, 'scannedTrackings', getRandomIdByTime(3))
  },
  updatePrescanHistory ({commit, getters}, payload) {
    const {paginationKey, isInbound, ...rest} = payload
    return dbAccessor.updateFieldsStore({...rest, type: isInbound ? 'inbound' : 'outbound'}, 'warehouses', getters.activeWarehouse, 'scannedTrackings', paginationKey)
  },
  async createAudit ({commit, getters}, payload) {
    const {siteKey, note} = payload
    const _key = getRandomIdByTime(3)
    const inventoryDocs = await dbAccessor.queryWithPredicatesStore([{
      field: 'siteKey',
      compare: '==',
      value: siteKey
    }], 'warehouses', getters.activeWarehouse, 'inventory')

    const auditRecord = new AuditRecord({
      inventoryDocs,
      siteKey,
      note,
      workerName: getters.userExtra.name
    })
    const record = auditRecord.getData()
    await dbAccessor.updateStore(record, 'warehouses', getters.activeWarehouse, 'auditRecords', _key)
    return {
      ...record,
      _key
    }
  },
  async syncAuditInventory ({commit, getters}, payload) {
    let {siteKey, auditRecord} = payload
    const {upcs} = auditRecord
    const inventoryDocs = await dbAccessor.queryWithPredicatesStore([{
      field: 'siteKey',
      compare: '==',
      value: siteKey
    }], 'warehouses', getters.activeWarehouse, 'inventory')

    const updatedRecord = new AuditRecord({
      inventoryDocs,
      siteKey,
      workerName: getters.userExtra.name
    })
    const {upcs: updatedUpcs} = updatedRecord.getData()
    const updatedUpcMap = new Map(updatedUpcs.map(item => [item.upc, {qty: item.qty, abnormalQty: item.abnormalQty}]))
    const upcSet = new Set(upcs.map(item => item.upc))
    return {
      upcs: [
        ...(upcs.map(item => {
          const {qty = 0, abnormalQty = 0} = updatedUpcMap.get(item.upc) || {}
          return item.isConfirmed ? item : {...item, qty, abnormalQty}
        })), 
        ...(updatedUpcs
          .filter(item => !upcSet.has(item.upc))
          .map(item => {
            const {qty, abnormalQty, upc} = item
            return {
              qty, 
              abnormalQty,
              auditQty: 0,
              abnormalAuditQty: 0,
              isConfirmed: false,
              upc,
              note: ''
            }
          }))
      ]
    }
  },
  getAuditRecords ({commit, getters}, payload) {
    let predicates = []

    payload.startDate && payload.endDate && (predicates = [...predicates, {
      field: `createTime`,
      compare: '>=',
      value: payload.startDate
    },
    {
      field: `createTime`,
      compare: '<=',
      value: payload.endDate
    }])

    return dbAccessor.queryWithPagination(predicates, ['warehouses', getters.activeWarehouse, 'auditRecords'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  async saveAudit ({commit, getters}, payload) {
    const {_key, upcs, initUpcs, ...rest} = payload
    const auditDoc = await dbAccessor.queryStore('warehouses', getters.activeWarehouse, 'auditRecords', _key)
    const {upcs: updatedUpcs = []} = auditDoc.data() || {}
    const updatedUpcMap = new Map(updatedUpcs.map(item => [item.upc, item]))
    const initUpcMap = new Map(initUpcs.map(item => [item.upc, item]))
    let isUpcUpdated = false
    const newUpcs = upcs.map((item, index) => {
      const isThisItemUpdated = !deepEqual(initUpcMap.get(item.upc), updatedUpcMap.get(item.upc))
      // will turn true once an result is true
      isUpcUpdated = isUpcUpdated || isThisItemUpdated
      if (isThisItemUpdated && deepEqual(item, initUpcMap.get(item.upc))) {
        return updatedUpcMap.get(item.upc)
      } else {
        return {...item}
      }
    })
    if (isUpcUpdated) {
      if (confirm('This audit record has conflicts with recent updated version, Do you want to merge your update to the most recent version? If not will reverse your current changes.')) {
        await dbAccessor.updateFieldsStore({
          upcs: newUpcs,
          ...rest
        }, 'warehouses', getters.activeWarehouse, 'auditRecords', _key)
        return {status: 'done', newUpcs}
      }
      return {status: 'reverse'}
    }
    await dbAccessor.updateFieldsStore({
      upcs: newUpcs,
      ...rest
    }, 'warehouses', getters.activeWarehouse, 'auditRecords', _key)

    return {status: 'done', newUpcs}
  },
  async updateAudit ({commit, getters}, {_key, ...rest}) {
    await dbAccessor.updateFieldsStore({
      ...rest
    }, 'warehouses', getters.activeWarehouse, 'auditRecords', _key)

    return {status: 'done'}
  },
  getInboundTrackingCache ({commit, getters}) {
    const successFunc = (doc) => {
      const {trackings = []} = convertTimestampToDateInObj(doc.data() || {})
      commit('setInboundTrackingCache', trackings)
    }

    const errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    const unsubscribe = dbAccessor.queryRT(
      successFunc, 
      errorFunc, 
      [], 
      ['warehouses', getters.activeWarehouse, 'uploadHistory', 'inboundTrackingCache']
    )
    commit('addTosubscribed', {uploadHistory: unsubscribe})
  },
  getDailyInboundRT ({commit, getters}, {siteKey, dateString}) {
    const successFunc = (doc) => {
      const { upcToQtyMapArray = [] } = convertTimestampToDateInObj(doc.data() || {})
      commit('setDailyInboundMap', new Map(upcToQtyMapArray.map(({key, value}) => [key, value])))
    }

    const errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    const unsubscribe = dbAccessor.queryRT(
      successFunc, 
      errorFunc, 
      [], 
      ['warehouses', getters.activeWarehouse, 'sites', siteKey, 'dailyInbound', dateString]
    )
    commit('addTosubscribed', {dailyInbound: unsubscribe})
  },
  unsubscribeDailyInbound ({state}) {
    if (state.subscribed) {
      state.subscribed.dailyInbound && state.subscribed.dailyInbound()
      delete state.subscribed.dailyInbound
      state.dailyInbound = initialState.dailyInbound
    }
  },
  finishUpcStow ({commit, getters}, {stowMap, siteKey, dateKeyStr}) {
    return dbAccessor.runInTransactionStore(async transaction => {
      const doc = await transaction.get(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'sites', siteKey, 'dailyInbound', dateKeyStr]))
      let {upcToQtyMapArray = []} = doc.data() || {}
      let upcToQtyMap = new Map(upcToQtyMapArray.map(({key, value}) => [key, value]))

      upcToQtyMap.forEach((value, key) => {
        value.unstowedQty -= stowMap[key] || 0
        if (value.unstowedQty < 0) throw Error(`Upc: ${key}, stow quantity exceeded real quantity.`)
      })

      transaction.update(doc.ref, dbAccessor.addUpdateDocTimestamp({
        upcToQtyMapArray: [...upcToQtyMap].map(([key, value]) => {
          return {key, value}
        })
      }))
    })
  },
  getPickupRecordRT ({commit, getters}) {
    if (!getters.activeWarehouse) {
      return
    }

    let successFunc = (docs) => {
      let records = docs.docs.map(doc => {
        return {key: doc.id, ...convertTimestampToDateInObj(doc.data())}
      })
      commit('setPickupRecords', records)
    }

    let errorFunc = (error) => {
      console.error(`pickupRecords RT error`, error)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'pickupRecords'])
    commit('addTosubscribed', {pickupRecords: unsubscribe})
  },
  pickupItems ({commit, getters}, {selectedUpcs, selectedShipments}) {
    if (!getters.activeWarehouse) {
      return
    }
    const siteKey = selectedShipments[0].products[0].warehouseSite
    const upcSet = new Set(selectedUpcs.map(item => item.upc))
    const newShipments = getters.shipments
      .filter(shipment => shipment.products.some(product => product.warehouseSite === siteKey))

    console.log(upcSet, selectedShipments)
    return dbAccessor.runInTransactionStore(async transaction => {
      const doc = await transaction.get(dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'pickupRecords', siteKey]))
      let {shipmentToPickedUpcs = {}} = doc.data() || {}
      let map = {}
      newShipments.forEach(({_key, products}) => {
        map[_key] = shipmentToPickedUpcs[_key] || []
        if (selectedShipments.some(({_key: shipmentKey}) => shipmentKey === _key)) {
          map[_key] = [...map[_key], ...products.map(({upc}) => upc).filter(upc => upcSet.has(upc))]
        }
      })
      if (doc.exists) {
        transaction.update(doc.ref, dbAccessor.addUpdateDocTimestamp({shipmentToPickedUpcs: map}))
      } else {
        transaction.set(doc.ref, dbAccessor.addNewDocTimestamp({shipmentToPickedUpcs: map}))
      }
    })
  }
}

export const getters = {
  warehouseName (state) {
    return state.warehouseLimitedInfo.warehouseName
  },
  settingPromotions (state) {
    return state.settingPromotions
  },
  warehouseOrganizations (state) {
    return state.warehouseOrganizations
  },
  organizationKeyToId (state) {
    return new Map(state.warehouseOrganizations.map(item => [item.key, item.organizationId]))
  },
  sortedWarehouseOrganizations (state) {
    return state.warehouseOrganizations.map(item => {
      return {...item, displayName: `${item.organizationId} (${item.tenantName})`}
    }).sort(sortNoCase('organizationId'))
  },
  getWarehouseOrganizationsByKey (state) {
    return key => state.warehouseOrganizations.find(org => org.key === key)
  },
  tenantKey2BillingsMap (state) {
    return new Map(state.warehouseBillings.map(item => {
      let {tenantKey, ...rest} = item
      return [tenantKey, rest]
    }))
  },
  tenantsWithBillings (state, getters) {
    return state.warehouseOrganizations.map(org => {
      let {key, isInboundWaived, isOutboundWaived, isStorageWaived} = org
      let waives = []
      isInboundWaived && (waives.push('inbound'))
      isOutboundWaived && (waives.push('outbound'))
      isStorageWaived && (waives.push('storage'))
      let billing = getters.tenantKey2BillingsMap.get(key)
      if (billing) {
        let {balance, expenseHistory} = billing
        return {...org, balance, expenseHistory, waives}
      }
      return {...org, balance: 0, waives}
    })
  },
  warehouseAnnouncements (state, getters) {
    return state.warehouseAnnouncements
  },
  packageReports (state, getters) {
    return state.packageReports
  },
  inboundTrackingCache (state, getters) {
    return state.inboundTrackingCache
  },
  abnormalPackages (state, getters) {
    return state.abnormalPackages
  },
  statistics (state, getters) {
    return state.statistics
  },
  warehouseEmailTemplates (state, getters) {
    return state.warehouseLimitedInfo.emailTemplates
  },
  warehouseOrgSettings (state, getters) {
    return state.warehouseLimitedInfo.orgSettings
  },
  warehouseLimitedInfo (state, getters) {
    return state.warehouseLimitedInfo
  },
  tierDiscounts (state) {
    let {tierDiscounts} = state.warehouseLimitedInfo
    if (tierDiscounts) {
      return Object.keys(tierDiscounts).map(key => {
        let discount = tierDiscounts[key]
        let {name, discountRate} = discount
        return {displayName: `${name} (${discountRate}%)`, key, ...discount}
      })
    } else return []
  },
  activateSkuMode (state, getters) {
    return getters.activeOrganization || !!(getters.warehouseInfo && 
      getters.warehouseInfo.generalSettings &&
      getters.warehouseInfo.generalSettings.skuMode)
  },
  activateAdvancedOutboundMode (state, getters) {
    return !!(getters.warehouseInfo && 
      getters.warehouseInfo.generalSettings &&
      getters.warehouseInfo.generalSettings.advancedOutbound)
  },
  activatePrescan (state, getters) {
    return getters.activeOrganization || !!(getters.warehouseInfo && 
      getters.warehouseInfo.generalSettings &&
      getters.warehouseInfo.generalSettings.activatePrescan)
  },
  dailyInboundMap (state) {
    return state.dailyInboundMap
  },
  pickupRecords (state) {
    return state.pickupRecords
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}
