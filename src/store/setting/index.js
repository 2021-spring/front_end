import * as dbAccessor from '@/utils/dbAccessor'
import { cloneDeep } from '@/utils/tools'

const initialState = {
  version: '',
  newVersion: '',
  reloadPage: false,
  upcMap: {},
  warehouseInfo: {},
  warehousesSites: [],
  logQueue: [],
  isSysUpdating: false,
  updatingText: '',
  env: 'development',
  loaderButtonError: '',
  cronjobTimes: {},
  labelStripeKey: {},
  betaFeatures: [],
  fullBetaFeatures: [],
  labelServices: [],
  internationalLabelServices: [],
  isRestrictInternationalLabel: true
}

const state = Object.assign({}, initialState)

export const mutations = {
  reset_state (state) {
    for (let prop in state) {
      if (prop !== 'version' && prop !== 'env') {
        state[prop] = initialState[prop]
      }      
    }
  },
  setVersion (state, payload) {
    console.log('set app version: ', payload)
    state.version = payload
  },
  setEnvironment (state, payload) {
    console.log('set app environment: ', payload)
    state.env = payload
  },
  setNewVersion (state, payload) {
    state.newVersion = payload
  },
  setReloadPage (state, payload) {
    console.log('set reload page flag: ', payload)
    state.reloadPage = payload
  },
  setUpcMap (state, payload) {
    state.upcMap = payload
  },
  setWarehouseInfo (state, payload) {
    state.warehouseInfo = payload
  },
  setWarehouseSites (state, payload) {
    state.warehousesSites = payload
  },
  logEvent (state, payload) {
    let newPayload = payload
    state.logQueue.push(newPayload)
  },
  clearEvents (state) {
    state.logQueue = []
  },
  setIsSysUpdating (state, payload) {
    state.isSysUpdating = payload
  },
  setIsRestrictInternationalLabel (state, payload) {
    state.isRestrictInternationalLabel = payload
  },
  setUpdatingText (state, payload) {
    state.updatingText = payload
  },
  loaderButtonError (state, payload) {
    state.loaderButtonError = payload
  },
  loaderButtonClear (state) {
    state.loaderButtonError = ''
  },
  setCronjobTimes (state, payload) {
    state.cronjobTimes = payload
  },
  setWarehouseRates (state, payload) {
    state.warehouseLimitedInfo.rates = payload
  },
  setLabelStripeKey (state, payload) {
    state.labelStripeKey = payload
  },
  setBetaFeatures (state, payload) {
    state.betaFeatures = payload
  },
  setFullBetaFeatures (state, payload) {
    state.fullBetaFeatures = payload
  },
  setLabelServices (state, payload) {
    state.labelServices = payload
  },
  setInternationalLabelServices (state, payload) {
    state.internationalLabelServices = payload
  }
}

export const actions = {
  reset_state ({commit}) {
    commit('reset_state')
  },
  initializeApp ({commit, state, dispatch, getters}, payload) {
    let routineFlushLogs = () => {
      if (getters.user && state.logQueue.length > 0) {
        dbAccessor.callFunction('logUiEvents', {messages: [...state.logQueue], version: getters.version})
        commit('clearEvents')
      }
    }
    setInterval(routineFlushLogs, 15000)

    let closeEventHandler = () => {
      console.log('leaving application now')
      commit('logEvent', 'Leaving application')
      dispatch('flushEventLogs')
    }

    window.onbeforeunload = closeEventHandler
  },
  loadSystemInfo ({commit, getters}) {
    let successFunc = (doc) => {
      let sysAdmin
      if (doc.exists) sysAdmin = doc.data()
      let version = (sysAdmin && sysAdmin.version) || '1.1.1'
      let newVersion = version.split('.')
      let [major, minor, revision] = newVersion
      let [currentMajor, currentMinor, currentRevision] = getters.version ? getters.version.split('.') : ['1', '1', '1']
      if (parseInt(major) > parseInt(currentMajor)
          || (parseInt(major) === parseInt(currentMajor) && parseInt(minor) > parseInt(currentMinor))
          || (parseInt(major) === parseInt(currentMajor) && parseInt(minor) === parseInt(currentMinor) && parseInt(revision) > parseInt(currentRevision))) {
        console.log('reload now')
        commit('setNewVersion', version)
        commit('setReloadPage', true)
      }
      commit('setCronjobTimes', sysAdmin.cronjobTimes)
      commit('setIsSysUpdating', sysAdmin.isSysUpdating)
      commit('setIsRestrictInternationalLabel', sysAdmin.isRestrictInternationalLabel)
      commit('setUpdatingText', sysAdmin.updatingText)
      commit('setLabelServices', sysAdmin.labelServices)
      commit('setInternationalLabelServices', sysAdmin.internationalLabelServices)
      commit('setLabelStripeKey', {
        stripePublicLiveKey: sysAdmin.stripePublicLiveKey, 
        stripePublicTestKey: sysAdmin.stripePublicTestKey
      })
      commit('setBetaFeatures', Object.keys(sysAdmin.betaFeatures || {}).map(
        key => sysAdmin.betaFeatures[key].some(uid => 
          uid === 'all' || 
          uid === getters.activeWarehouse ||
          uid === getters.activeOrganization
        ) && key
      ).filter(key => key))
      if (getters.user.isAdmin) commit('setFullBetaFeatures', sysAdmin.betaFeatures)
    }

    let errorFunc = (error) => {
      console.error(`Cann't get system version`, error)
      throw error
    }

    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, [], 'sysAdmin', 'general')
    commit('addTosubscribed', {systemSetting: unsubscribe})
  },
  // payload is ['action', 'data']
  logEvent ({commit, getters, dispatch}, payload) {
    let detail = typeof payload[1] === 'object' ? JSON.stringify(payload[1]) : payload[1]
    let message = `action(${payload[0]}), payload(${detail})`
    commit('logEvent', message)
    if (getters.eventLogs.length > 30) {
      dispatch('flushEventLogs')
    }
  },
  addChangeLog ({commit, getters}, payload) {
    let {uid, name} = getters.userExtra
    payload.userInfo = {userName: name, userKey: uid}
    dbAccessor.insertStore(payload, 'changeLogs')
  },
  logCriticalEvent ({commit, dispatch}, payload) {
    let message = {
      action: payload[0],
      message: payload[1],
      isError: true
    }
    commit('logEvent', message)
    dispatch('flushEventLogs')
  },
  flushEventLogs ({commit, getters}) {
    return dbAccessor.callFunction('logUiEvents', {messages: [...state.logQueue], version: getters.version})
      .then(() => {
        commit('clearEvents')
      })
  },
  loadUpc ({commit, getters}) {
    commit('setLoading', true)
    if (!getters.activeWarehouse) return
    let successFunc = docs => {
      const upcs = {}
      docs.forEach(doc => {
        let item = doc.data()
        let approvedSkus = {}
        let keywords = []
        item.approvedSkus && item.approvedSkus.forEach(sku => {
          const [organizationKey, skuForDisplay] = sku.split('_')
          approvedSkus[organizationKey] = approvedSkus[organizationKey] || []
          approvedSkus[organizationKey].push(skuForDisplay)
          keywords.push(skuForDisplay)
        })
        if (upcs[item.upc || doc.id]) console.log('dup upc: ', item.upc || doc.id)
        upcs[item.upc || doc.id] = {
          key: doc.id,
          ...item,
          approvedSkus,
          keywordForSearch: keywords.join(', ')
        }
      })
      commit('setUpcMap', upcs)
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let predicates = []
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['warehouses', getters.activeWarehouse, 'upcs'])
    commit('addTosubscribed', {warehouseUpc: unsubscribe})
  },
  addUpc ({commit, getters}, payload) {
    commit('clearError')
    let data = {...payload}
    if (data.size) {
      if (data.size === 'custom') {
        data.unitFee = data.unitFee || 0
      } else {
        delete data.unitFee
      }
    }
    
    return dbAccessor.insertStore(data, 'warehouses', getters.activeWarehouse, 'upcs')
      .catch((error) => {
        console.log(error)
        commit('setError', error)
      })
  },
  deleteUpc ({commit, getters}, payload) {
    commit('clearError')
    return dbAccessor.removeStore('warehouses', getters.activeWarehouse, 'upcs', payload.key)
      .catch((error) => {
        console.log(error)
        commit('setError', error)
      })
  },
  updateUpc ({commit, getters}, payload) {
    commit('clearError')
    let {description, key, size, unitFee, location = []} = payload
    let updateFields = {}
    
    description && (updateFields.description = description) 
    if (!!size || size === 0) {
      updateFields.size = size
    }
    location && (updateFields.location = location)
    updateFields.unitFee = size === 'custom' ? (unitFee || 0) : dbAccessor.deleteField()
    return dbAccessor.updateFieldsStore(updateFields, 'warehouses', getters.activeWarehouse, 'upcs', key)
      .catch((error) => {
        console.log(error)
      })
  },
  loadWarehouseInfo ({commit, getters}) {
    if (!getters.activeWarehouse) {
      return
    }

    let successFunc = (doc) => {
      if (doc.exists) {
        let warehouseInfo = doc.data()
        commit('setWarehouseInfo', warehouseInfo)
      }
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse])
    commit('addTosubscribed', {warehouseInfo: unsubscribe})
  },
  loadWarehouseSite ({commit, getters}, payload) {
    commit('setLoading', true)
    if (!getters.activeWarehouse) {
      return
    }
    let successFunc = docs => {
      const warehousesStore = []
      docs.forEach(doc => {
        let site = doc.data()
        site.key = doc.id
        warehousesStore.push(site)
      })
      commit('setWarehouseSites', warehousesStore)
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let predicates = []
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['warehouses', getters.activeWarehouse, 'sites'])
    commit('addTosubscribed', {warehouseSites: unsubscribe})
  },
  clearAllWarehousesData ({getters, state}) {
    getters.subscribed.warehouseSites && getters.subscribed.warehouseSites()
    delete getters.subscribed.warehouseSites
    state.warehouseSites = initialState.warehouseSites
  },
  addWarehouseSite ({commit, getters}, payload) {
    commit('clearError')
    dbAccessor.insertStore(payload, 'warehouses', getters.activeWarehouse, 'sites')
      .then((data) => {
        const key = data.id
        commit('addWarehouseSites', {
          ...payload,
          key: key
        })
      })
      .catch((error) => {
        console.log(error)
        commit('setError', error)
      })
  },
  addTenant ({commit, getters}, payload) {
    commit('clearError')
    return dbAccessor.insertStore(payload, 'tenants')
      .then((data) => {
        const id = data.id
        commit('addTenant', {
          ...payload,
          id: id
        })
        return id
      })
      .catch((error) => {
        console.log(error)
        commit('setError', error)
      })
  },
  editAdminFeature ({commit, getters}, payload) {
    if (payload.some(item => item === 'all')) {
      payload = ['all']
    }
    const update = {
      'betaFeatures.labelAndOrder': payload
    }

    return dbAccessor.updateFieldsStore(update, 'sysAdmin', 'general')
  },
  async editClientConfig ({commit, getters}, payload) {
    let {clientKey, discount = {}, accountManager = '', lowestBalance = 0, features, clientName} = payload
    let featureSet = new Set(features)
    let newFeatures = cloneDeep(getters.fullBetaFeatures)

    Object.keys(newFeatures).forEach(feature => {
      if (!featureSet.has(feature)) {
        newFeatures[feature] = newFeatures[feature].filter(item => item !== clientKey)
      } else {
        !newFeatures[feature].includes(clientKey) && (newFeatures[feature].push(clientKey))
      }
    })
    await dbAccessor.runInTransactionStore(async transaction => {
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['systemBalance', clientKey]))
      let updates = {
        discount, 
        accountManager, 
        clientName,
        lowestBalance
      }
      if (balanceDoc.exists) {
        transaction.update(balanceDoc.ref, updates)
      } else {
        transaction.set(balanceDoc.ref, {...updates, balance: 0})
      }
      transaction.update(dbAccessor.buildStoreQuery(['sysAdmin', 'general']), {betaFeatures: newFeatures})
    })
  },
  async getAllLimitedInfo ({commit, getters}, payload) {
    let tenantDocs = await dbAccessor.queryStore('tenantLimitedInfo')
    let warehouseDocs = await dbAccessor.queryStore('warehouseLimitedInfo')

    return [
      ...tenantDocs.docs.map(doc => {
        return {
          name: doc.data().name,
          email: doc.data().email,
          type: 'organization',
          key: doc.id
        }
      }),
      ...warehouseDocs.docs.map(doc => {
        return {
          name: doc.data().warehouseName,
          email: doc.data().email,
          type: 'warehouse',
          key: doc.id
        }
      })
    ]
  },
  updateOrganization ({commit, getters}, payload) {
    commit('clearError')
    payload.warehouseKey = getters.activeWarehouse
    payload.warehouseName = getters.warehouseName
    payload.sites = getters.warehousesSites
    let discount = getters.tierDiscounts.find(item => item.key === payload.discountKey)
    if (discount) {
      payload.discountRate = discount.discountRate
    } else {
      payload.discountRate = 0
    }

    let {requestId, balance, expenseHistory, waives, key, ...org} = payload
    org.id || (org.id = key)
    org.organizationId && (org.organizationId = org.organizationId.trim())
    const set = new Set(waives)
    org.isInboundWaived = set.has('inbound')
    org.isOutboundWaived = set.has('outbound')
    org.isStorageWaived = set.has('storage')
    return dbAccessor.callFunction('updateOrganization', org)
      .then(() => {
        requestId && dbAccessor.removeStore('joinWarehouseRequests', requestId)
      })
  },
  updateLabelStatus ({getters}) {
    return getters.user.isAdmin && dbAccessor.callFunction('updateLabelsStatus', {})
      .then((data) => {
        alert('label update function has updated ' + data.data + ' labels')
      })
  }
}

export const getters = {
  version (state) {
    return state.version
  },
  newVersion (state) {
    return state.newVersion
  },
  env (state) {
    return state.env
  },
  reloadPage (state) {
    return state.reloadPage
  },
  tempSkus (state) {
    return Object.values(state.upcMap).filter((item) => item.isSku)
  },
  tempSkuMap (state, getters) {
    let map = {}
    getters.tempSkus.forEach(item => {
      const {organizationKey, sku} = item
      map[`${organizationKey}_${sku}`] = item
    })
    return map
  },
  upcMap (state) {
    return state.upcMap
  },
  skuToUpcMap (state) {
    let map = {}
    Object.entries(state.upcMap).forEach(([upc, value]) => {
      const {approvedSkus = {}} = value
      Object.entries(approvedSkus).forEach(([organizationKey, skus]) => {
        skus.forEach(sku => {
          map[`${organizationKey}_${sku}`] = upc
        })
      })
    })
    return map
  },
  getUpcName (state) {
    return key => state.upcMap[key] && state.upcMap[key].description
  },
  warehouseInfo (state) {
    return state.warehouseInfo
  },
  warehousesSites (state) {
    return state.warehousesSites
  },
  warehousesSiteKeyMap (state) {
    return new Map(state.warehousesSites.map(item => [item.key, item]))
  },
  eventLogs (state) {
    return state.logQueue
  },
  isSysUpdating (state) {
    return state.isSysUpdating
  },
  isRestrictInternationalLabel (state) {
    return state.isRestrictInternationalLabel
  },
  updatingText (state) {
    return state.updatingText
  },
  loaderButtonError (state) {
    return state.loaderButtonError
  },
  upcSizes (state, getters) {
    return [...getters.warehouseLimitedInfo.rates.unitRates, { name: 'custom' }]
  },
  cronjobTimes (state) {
    return state.cronjobTimes
  },
  labelStripeKey (state) {
    return state.labelStripeKey
  },
  betaFeatures (state) {
    return state.betaFeatures
  },
  fullBetaFeatures (state) {
    return state.fullBetaFeatures
  },
  labelServices (state) {
    return state.labelServices
  },
  internationalLabelServices (state) {
    return state.internationalLabelServices
  },
  labelDefaultService (state) {
    for (let labelService of state.labelServices) {
      const {serviceTypes = []} = labelService
      let defaultVal = serviceTypes.find((serviceType) => serviceType.default)
      if (defaultVal) {
        return defaultVal.value
      }
    }
    return 'FEDEX_GROUND'
  },
  labelDefaultCarrier (state, getters) {
    return state.labelServices.find(({serviceTypes = [ ]}) => 
      serviceTypes.some(({value}) => 
        value === getters.labelDefaultService
      )
    ).carrier || 'FedEx'
  },
  getCarrierByServiceType (state) {
    return (serviceType) => {
      const vendor = state.labelServices.some(vendor => vendor.serviceTypes.some(({value}) => serviceType === value))
      if (vendor) return vendor.carrier
      return false
    }
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}
