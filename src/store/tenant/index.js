import * as dbAccessor from '@/utils/dbAccessor'
import {getApprovalTypeString, getDifferenceShallow, getNullFields, Logger, addNumbers, convertTimestampToDateInObj, toLocalDateString, splitProductName, toPickerDateString, splitKeyword, toMoney, cloneDeep} from '@/utils/tools'
import { ViteModel, Shipment, ArchivedShipment, Product, Announcement, PackageReportTenant, ProductTransfer, Support, Package, PriceHistory, OrderFactory } from '@/orm'
import JSZip from 'jszip'
import xlsx from 'xlsx'

const initialState = {
  products: [],
  offers: [],
  expiredOffers: [],
  archives: [],
  proposes: [],
  users: [],
  userRequest: [],
  groups: [],
  subscribed: {},
  tenant: {},
  inbound: [],
  shipments: [],
  archivedShipments: [],
  balance: {},
  tenantLimitedInfo: {},
  pendingTransactions: [],
  warehouses: [],
  reportLost: [],
  warehousesPromotionsMap: new Map(),
  warehouseBillings: [],
  warehouseLimitedInfoForTenant: [],
  tenantAnnouncements: [],
  pendingProductTransfers: [],
  supports: [],
  priceHistories: [],
  doneSupports: [],
  orders: [],
  uploadHistory: {},
  tenantAddresses: [],
  tenantPackagings: [],
  templates: [],
  systemBalance: {},
  systemBalances: [],
  labelTemplateFlexibleVars: ['orderId', 'sku'],
  skuRequests: [],
  uploadedTrackings: new Set(),
  favorites: {},
  shipmentDrafts: [],
  amazonSites: [],
  viteSupports: [],
  scheduleBMap: {}
}

const state = Object.assign({}, initialState)

export const mutations = {
  reset_state (state) {
    for (let prop in state) {
      state[prop] = initialState[prop]
    }
  },
  setTenant (state, payload) {
    state.tenant = payload
  },
  setProducts (state, payload) {
    state.products = payload
  },
  setOffers (state, payload) {
    state.offers = payload
  },
  setExpiredOffers (state, payload) {
    state.expiredOffers = payload
  },
  setArchives (state, payload) {
    state.archives = payload
  },
  setProposes (state, payload) {
    state.proposes = payload
  },
  setUsers (state, payload) {
    state.users = payload
  },
  setUserRequest (state, payload) {
    state.userRequest = payload
  },
  setGroups (state, payload) {
    state.groups = payload
  },
  setInbound (state, payload) {
    state.inbound = payload
  },
  setShipments (state, payload) {
    state.shipments = payload
  },
  setArchivedShipments (state, payload) {
    state.archivedShipments = payload
  },
  setBalance (state, payload) {
    state.balance = payload
  },
  setPendingTransactions (state, payload) {
    state.pendingTransactions = payload
  },
  setTenantLimitedInfo (state, payload) {
    state.tenantLimitedInfo = payload
  },
  setWarehouses (state, payload) {
    state.warehouses = payload
  },
  setWarehouseLimitedInfoForTenant (state, payload) {
    state.warehouseLimitedInfoForTenant = payload
  },
  setWarehouseBillings (state, payload) {
    state.warehouseBillings = payload
  },
  addTosubscribed (state, payload) {
    state.subscribed = {...state.subscribed, ...payload}
  },
  setReportLost (state, payload) {
    state.reportLost = payload
  },
  setWarehousesPromotionsMap (state, payload) {
    state.warehousesPromotionsMap = payload
  },
  setTenantAnnouncements (state, payload) {
    state.tenantAnnouncements = payload
  },
  setPendingProductTransfers (state, payload) {
    state.pendingProductTransfers = payload
  },
  setSupports (state, payload) {
    state.supports = payload
  },
  setPriceHistories (state, payload) {
    state.priceHistories = payload
  },
  setOrders (state, payload) {
    state.orders = payload
  },
  setUploadHistory (state, payload) {
    state.uploadHistory = payload
  },
  setTenantAddresses (state, payload) {
    state.tenantAddresses = payload
  },
  setTenantPackagings (state, payload) {
    state.tenantPackagings = payload
  },
  setTemplates (state, payload) {
    state.templates = payload
  },
  setSystemBalance (state, payload) {
    state.systemBalance = payload
  },
  setSystemBalances (state, payload) {
    state.systemBalances = payload
  },
  setSkuRequests (state, payload) {
    state.skuRequests = payload
  },
  setUploadedTrackings (state, payload) {
    state.uploadedTrackings = payload
  },
  setFavorites (state, payload) {
    state.favorites = payload
  },
  setShipmentDrafts (state, payload) {
    state.shipmentDrafts = payload
  },
  setAmazonSites (state, payload) {
    state.amazonSites = payload
  },
  setViteSupports (state, payload) {
    state.viteSupports = payload
  },
  setScheduleBMap (state, payload) {
    state.scheduleBMap = payload
  }
}

export const actions = {
  reset_state ({commit}) {
    commit('reset_state')
  },
  loadTenantData ({commit, getters}) {
    if (getters.activeOrganization) {
      let successFunc = (doc) => {
        let tenant = doc.data()
        tenant.destinations = tenant.destinations ? tenant.destinations.map((item, index) => {
          return {...item, index}
        }) : []
        tenant.instructions = tenant.instructions ? tenant.instructions.map((item, index) => {
          return {...item, index}
        }) : []
        commit('setTenant', tenant)
      }
  
      let errorFunc = (error) => {
        console.error(error)
        commit('setLoading', false)
        throw error
      }
      let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization])
      commit('addTosubscribed', {tenant: unsubscribe})
    }
  },
  getAllProducts ({commit, getters}) {
    if (getters.activeOrganization) {
      commit('setLoading', true)
      let successFunc = (docs) => {
        let products = []
        docs.forEach(doc => {
          const obj = convertTimestampToDateInObj(doc.data())
          const upc = obj.upc
          const id = doc.id
          obj.onlyForSearch = [...(obj.asin || []), ...(obj.sku || []), obj.note || ''].join()
          products.push({...obj, upc, id})
        })
        commit('setProducts', products)
        commit('setLoading', false)
      }

      let errorFunc = (error) => {
        console.log(error)
        commit('setLoading', false)
        throw error
      }

      let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, [], 'tenants', getters.activeOrganization, 'inventory')
      commit('addTosubscribed', {products: unsubscribe})
    }
  },
  addProduct ({commit, getters}, payload) {
    return dbAccessor.increaseValueInTransactionStore('productIndex', 1, ['tenants', getters.activeOrganization])
      .then(index => {
        // need to check upc existence first
        index = index.toString().padStart(8, '0')
        payload.id = index
        payload.isArchived = false
        return dbAccessor.updateStore(payload, 'tenants', getters.activeOrganization, 'inventory', index)
          .then(() => {
            if (payload.upc) {
              return dbAccessor.callFunction('processPackages', {tenantKey: getters.activeOrganization, productId: payload.id, upc: payload.upc})
            }
            return index
          })
          .then(() => {
            return Logger.changeLog({
              beforeValue: {}, 
              actionPayload: payload,
              actionName: 'addProduct',
              categories: ['inventory'],
              keys: [index],
              keywords: payload.upc ? [payload.upc] : []
            })
          })
          .catch(error => {
            Logger.critical('addProduct', {error: error.message, ...payload})
          })
      })
  },
  editProduct ({commit, getters}, payload) {
    const {newProduct, isTriggerProcessPackage = false} = payload
    let oldProduct = getters.products.find(product => product.id === newProduct.id)
    let isUPCChanged = (oldProduct.upc !== newProduct.upc)
    Logger.log('editProduct', {isUPCChanged: isUPCChanged, ...newProduct})
    return dbAccessor.updateFieldsStore({...newProduct, value: dbAccessor.deleteField()}, 'tenants', getters.activeOrganization, 'inventory', newProduct.id)
      .then(() => {
        if ((newProduct.upc && isUPCChanged) || isTriggerProcessPackage) {
          return dbAccessor.callFunction('processPackages', {tenantKey: getters.activeOrganization, productId: newProduct.id})
        }
        return 'success'
      })
      .then(() => {
        let logBeforeValue = {...oldProduct}
        let logPayload = {...newProduct, isTriggerProcessPackage}
        let keywords = new Set()
        logPayload.upc && (keywords.add(logPayload.upc))
        logBeforeValue.upc && (keywords.add(logBeforeValue.upc))
        delete logBeforeValue.distribution
        delete logPayload.distribution
        return Logger.changeLog({
          beforeValue: logBeforeValue, 
          actionPayload: logPayload,
          actionName: 'editProduct',
          categories: ['inventory'],
          keys: [newProduct.id],
          keywords: [...keywords]
        })
      })
      .catch(error => {
        Logger.critical('editProduct', {error: error.message, isUPCChanged: isUPCChanged, ...newProduct, isTriggerProcessPackage})
      })
  },
  clearAllOfferData ({state}) {
    state.subscribed.offers && state.subscribed.offers()
    state.subscribed.archives && state.subscribed.archives()
    state.subscribed.proposes && state.subscribed.proposes()
    delete state.subscribed.offers
    delete state.subscribed.archives
    delete state.subscribed.proposes
    state.offers = initialState.offers
    state.archives = initialState.archives
    state.proposes = initialState.proposes
  },
  clearAllGroupData ({state}) {
    state.subscribed.groups && state.subscribed.groups()
    delete state.subscribed.groups
    state.groups = initialState.groups
  },
  proposeOffer ({commit, getters}, payload) {
    payload.uid = getters.uid
    payload.userName = getters.userExtra.name
    payload.isPropose = true
    payload.isExpired = false
    delete payload.expirationDate
    return dbAccessor.insertStore(payload, 'offers', 'offers', 'proposes')
      .then(() => {
        return 'success'
      })
  },
  getProposedOffers ({commit, getters}, payload) {
    commit('setLoading', true)
    let successFunc = (docs) => {
      const workForSet = new Set(Object.keys(getters.activeWorkfor || {}))
      let proposes = docs.docs
        .map(doc => {
          const obj = convertTimestampToDateInObj(doc.data())
          const key = doc.id
          return {...obj, key}
        })
        .filter(offer => getters.activeOrganization ? true : workForSet.has(offer.tenantKey))
      commit('setProposes', proposes.sort((a, b) => a.createTime - b.createTime))
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }
    // get all offers for a tenant or for a member
    let predicates = getters.activeOrganization
      ? [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      :
      [
        {
          field: 'uid',
          compare: '==',
          value: getters.uid
        }
      ]
    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, predicates, 'offers', 'offers', 'proposes')
    commit('addTosubscribed', {proposes: unsubscribe})
  },
  acceptPropose ({commit, getters, dispatch}, payload) {
    // do we need to update the offer quantity. Not doing it now
    let {key, comments, ...item} = payload
    console.log(item.offerKey, item.quantity)
    return dbAccessor.runInBatch(async (batch) => {
      let offerRef = dbAccessor.buildStoreQuery(['offers', 'offers', 'proposes', key])
      let taskRef = dbAccessor.buildStoreQuery(['tasks', 'tasks', 'active']).doc()
      let originOfferRef = dbAccessor.buildStoreQuery(['offers', 'offers', 'active', item.offerKey])
      batch.delete(offerRef)
      batch.set(taskRef, dbAccessor.addUpdateDocTimestamp({
        ...item,
        searchKeywords: [item.offerKey, ...splitProductName(item.productName), item.userName]
      }))
      batch.update(originOfferRef, dbAccessor.addUpdateDocTimestamp({
        proposeQuantity: dbAccessor.incrementField(item.quantity)
      }))
    })
      .then(() => {
        dispatch('setProductPriceHistoryOfferNode', {
          productId: payload.productId,
          data: {
            offerId: payload.offerKey,
            price: payload.price,
            bonus: payload.bonus,
            allowSelf: !payload.isOnlyShipToWarehouse
          }
        })
      })
  },
  cancelPropose ({commit, getters}, payload) {
    return dbAccessor.removeStore('offers', 'offers', 'proposes', payload.key)
  },
  updatePropose ({commit, getters}, payload) {
    let item = {
      price: payload.price,
      quantity: payload.quantity,
      warehouse: payload.warehouse
    }
    return dbAccessor.updateFieldsStore(item, 'offers', 'offers', 'proposes', payload.key)
      .catch(error => {
        console.log(error.code)
        if (error.code === 'not-found') {
          console.log('document not found, no ops')
          return {message: 'The propose has been removed. Operation canceled'}
        } else {
          throw error
        }
      })
  },
  addProposeComment ({getters, commit}, payload) {
    let {comment, docKey} = payload
    return dbAccessor.updateFieldAddToArrayStore('comments', comment, 'offers', 'offers', 'proposes', docKey)
  },
  removeProposeComment ({getters, commit}, payload) {
    let {comment, docKey} = payload
    comment = convertTimestampToDateInObj(comment)
    let createTime
    if (comment.createTime) {
      createTime = comment.createTime
    } else { return Promise.reject(Error('create time missing')) }
    let predicate = {
      field: 'createTime',
      value: createTime
    }
    console.log('remove item')
    return dbAccessor.updateFieldRemoveOneFromArrayStore('comments', predicate, 'offers', 'offers', 'proposes', docKey)
  },
  getAllOffers ({commit, getters}) {
    commit('setLoading', true)
    let successFunc = (docs) => {
      const workForSet = new Set(Object.keys(getters.activeWorkfor || {}))
      const offers = docs.docs
        .map(doc => {
          const obj = convertTimestampToDateInObj(doc.data())
          const key = doc.id
          return {...obj, key}
        })
        .filter(offer => getters.activeOrganization ? true : workForSet.has(offer.tenantKey))
      commit('setExpiredOffers', offers.filter(item => item.isExpired))
      commit('setOffers', offers)
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    // get all offers for a tenant or for a member
    let predicates = getters.activeOrganization
      ? [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      :
      [
        {
          field: `userVisible`,
          compare: 'array-contains',
          value: getters.uid
        }
      ]
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['offers', 'offers', 'active'])
    commit('addTosubscribed', {offers: unsubscribe})
  },
  async addOffer ({commit, dispatch, getters}, payload) {
    payload.warehouseKeys = [...(new Set(payload.warehouseSites.map(({warehouseKey}) => warehouseKey)))]
    
    payload.taken = 0
    payload.tenantKey = getters.activeOrganization
    payload.lastEditTime = dbAccessor.getServerTimestamp()
    Logger.log('addOffer', payload)

    let index = await dbAccessor.increaseValueInTransactionStore('activeIndex', 1, ['offers', 'offers'])

    index = index.toString().padStart(4, '0')
    payload.isExpired = payload.expirationDate < new Date() ? (payload.isExpired = true) : (payload.isExpired = false)
    if (getNullFields(payload).length !== 0) {
      return Promise.reject(Error('Detect undefined fields in the payload: ' + payload))
    }
    if (!getters.productsWithUpcChangeableFlag.some(product => product.id === payload.productId)) {
      return Promise.reject(Error('Product has been archived.'))
    }
    return dbAccessor.updateStore(payload, 'offers', 'offers', 'active', index)
      .then(() => {
        dbAccessor.callFunction('notifyOfferUpdated', {newOffer: payload, oldOffer: {}, key: index})
        dispatch('setProductPriceHistoryOfferNode', {
          productId: payload.productId,
          data: {
            offerId: index,
            price: payload.price,
            bonus: payload.bonus,
            allowSelf: !payload.isOnlyShipToWarehouse
          }
        })
      })
  },
  editOffer ({commit, dispatch, getters}, payload) {
    let {offer, oldOffer, moveToTop} = payload
    if (offer.expirationDate > new Date()) offer.isExpired = false
    if (offer.expirationDate < new Date()) offer.isExpired = true
    offer.warehouseKeys = [...(new Set(offer.warehouseSites.map(({warehouseKey}) => warehouseKey)))]
    let updatedOffer = getDifferenceShallow(offer, oldOffer, {key: offer.key})
    moveToTop && (updatedOffer.lastEditTime = dbAccessor.getServerTimestamp())
    Logger.log('editOffer', payload)

    return dbAccessor.updateFieldsStore(updatedOffer, 'offers', 'offers', 'active', offer.key)
      .then(() => {
        dbAccessor.callFunction('notifyOfferUpdated', {newOffer: offer, oldOffer, key: offer.key})
        dispatch('setProductPriceHistoryOfferNode', {
          productId: offer.productId,
          data: {
            offerId: offer.key,
            price: offer.price,
            bonus: offer.bonus,
            allowSelf: !offer.isOnlyShipToWarehouse
          }
        })
      })
  },
  async archiveOffer ({commit, getters}, payload) {
    // check if has propose offers 
    if (getters.proposes.some(({offerKey}) => offerKey === payload.key)) {
      alert(`Can't archive this offer(id: ${payload.key}). There are active proposes, please resolve these proposes first.`)
      return
    } 

    if (!payload.ignoreCheckTasks) {
      const existedRelatedTask = (await dbAccessor.queryWithPagination([
        {field: 'offerKey', compare: '==', value: payload.key}
      ], ['tasks', 'tasks', 'active'], null, true, undefined, 1)).size
      if (existedRelatedTask ? !confirm(`Warning: The related tasks won't be able to confirm. \nDo you want to proceed? `) : !confirm('Are you sure to archive?')) {
        return
      }
    }
    payload.searchKeywords = splitProductName(payload.productName)
    delete payload.ignoreCheckTasks
    return dbAccessor.removeAndInsertBatchStore(['offers', 'offers', 'active', payload.key], payload, ['offers', 'offers', 'archives'])
  },
  restoreOffer ({commit, getters}, payload) {
    return dbAccessor.removeAndInsertBatchStore(['offers', 'offers', 'archives', payload._key], payload, ['offers', 'offers', 'active', payload.key])
  },
  getArchiveOffersPagination ({commit, getters}, payload) {
    if (!getters.activeOrganization) {
      const error = 'it is not an organization'
      commit('setError', error)
      return Promise.resolved('resolved')
    }

    let predicates = [{
      field: 'tenantKey',
      compare: '==',
      value: getters.activeOrganization
    }]
        
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

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: `searchKeywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      })
    }

    return dbAccessor.queryWithPagination(predicates, ['offers', 'offers', 'archives'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  getMemberRequested ({commit, getters}) {
    let predicates = [{
      field: 'TenantID',
      compare: '==',
      value: getters.activeOrganization
    }]
    dbAccessor.queryWithPredicatesStore(predicates, 'requests')
      .then((docs) => {
        let userRequest = []
        docs.forEach(doc => {
          const obj = doc.data()
          obj.tenantKey = getters.activeOrganization
          const requestKey = doc.id
          obj.status = 'pending'
          obj.balance = 0
          userRequest.push({...obj, requestKey})
        })
        commit('setUserRequest', userRequest)
      })
  },
  handleUserRequest ({commit, getters, dispatch}, payload) {
    if (getters.users.map(user => user.uid).includes(payload.request.uid)) {
      if (confirm('This user has already been added before, would you like to change the status to accepted?')) {
        return dispatch('editUserStatus', {userKey: payload.request.uid, approvalType: 3})
          .then(() => {
            dbAccessor.removeStore('requests', payload.request.requestKey)
            let userRequest = getters.userRequest.filter(request => request.requestKey !== payload.request.requestKey)
            return commit('setUserRequest', userRequest)
          })
      } else {
        return
      }
    }
    return dbAccessor.callFunction('handleUserRequest', payload)
      .then(() => {
        let userRequest = getters.userRequest
        for (let i = 0; i < userRequest.length; i++) {
          if (userRequest[i].uid === payload.request.uid) {
            userRequest[i].status = 'accepted'
            userRequest[i].approvalType = 3
            delete userRequest[i].requestKey
            userRequest.splice(i, 1)
            userRequest = [...userRequest]
          }
        }
        commit('setUserRequest', userRequest)
      })
  },
  rejectUserRequest ({commit, getters}, payload) {
    return dbAccessor.callFunction('handleUserRequest', payload)
      .then(() => {
        let userRequest = getters.userRequest
        for (let i = 0; i < userRequest.length; i++) {
          if (userRequest[i].uid === payload.request.uid) {
            userRequest.splice(i, 1)
            userRequest = [...userRequest]
          }
        }
        commit('setUserRequest', userRequest)
      })
  },
  editUserStatus ({commit, getters}, payload) {
    let userRef = dbAccessor.buildStoreQuery(['users', payload.userKey])
    let usersRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'general', 'users'])
    return dbAccessor.runInTransactionStore(transaction => {
      return Promise.all([transaction.get(userRef), transaction.get(usersRef)])
        .then(([doc, usersDoc]) => {
          const tenantKey = getters.activeOrganization
          let newPayload = doc.data()
          newPayload.workfor[tenantKey] = payload.approvalType
          let users = usersDoc.get('users') || []
          for (let i = 0; i < users.length; i++) {
            if (users[i].uid === payload.userKey) {
              users[i].approvalType = payload.approvalType
            }
          }
          return transaction
            .update(userRef, dbAccessor.addUpdateDocTimestamp(newPayload))
            .update(usersRef, dbAccessor.addUpdateDocTimestamp({users}))
        })
    })
  },
  clearAllUserData () {
    delete state.users
    state.users = initialState.users
  },
  getAllGroups ({commit, getters}) {
    let successFunc = (docs) => {
      let groups = []
      docs.forEach(doc => {
        const group = doc.data()
        group.groupKey = doc.id
        groups.push(group)
      })
      let sortFunc = (a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1
        return 0
      }
      groups.sort(sortFunc)
      commit('setGroups', groups)
    }

    let errorFunc = (error) => {
      console.log(error)
      throw error
    }
    
    let predicates = []
    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, predicates, 'tenants', getters.userExtra.organizations[0], 'groups')
    commit('addTosubscribed', {groups: unsubscribe})
  },
  addGroup ({commit, getters}, payload) {
    return dbAccessor.insertStore(payload, 'tenants', getters.activeOrganization, 'groups')
  },
  editGroup ({commit, getters, dispatch}, payload) {
    const {name, members, groupKey} = payload
    return dbAccessor.updateStore({name, members}, 'tenants', getters.activeOrganization, 'groups', groupKey)
      .then(() => dispatch('addUserToOfferByUpdateUserGroup', {groupKeys: [groupKey], uids: members.map(({uid}) => uid)}))
  },
  editUserGroups ({commit, getters, dispatch}, payload) {
    const {uid, name, groupKeys, initGroupKeys} = payload
    const initGroupKeySet = new Set(initGroupKeys)
    const groupKeySet = new Set(groupKeys)
    let groupKeysToAdd = groupKeys.filter(key => !initGroupKeySet.has(key))
    let groupKeysToDelete = initGroupKeys.filter(key => !groupKeySet.has(key))
    
    return dbAccessor.runInTransactionStore(async transaction => {
      const refBuilder = (key) => dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'groups', key])
      const addDocs = await Promise.all(groupKeysToAdd.map(key => transaction.get(refBuilder(key))))
      const deleteDocs = await Promise.all(groupKeysToDelete.map(key => transaction.get(refBuilder(key))))

      addDocs.forEach(doc => {
        let {members} = doc.data()
        transaction.update(doc.ref, dbAccessor.addUpdateDocTimestamp({members: [...members, {uid, name}]}))
      })

      deleteDocs.forEach(doc => {
        let {members} = doc.data()
        transaction.update(doc.ref, dbAccessor.addUpdateDocTimestamp({members: members.filter(member => member.uid !== uid)}))
      })
    })
      .then(() => dispatch('addUserToOfferByUpdateUserGroup', {groupKeys, uids: [uid]}))
  },
  async deleteGroup ({commit, getters}, payload) {
    const docId = payload.groupKey
    if (getters.tenantLimitedInfo.defaultUsers
      .some(user => user.isGroup && user.key === docId)) {
      await dbAccessor.updateFieldsStore({
        defaultUsers: getters.tenantLimitedInfo.defaultUsers.filter(user => user.key !== docId)
      }, 'tenantLimitedInfo', getters.activeOrganization)
    }
    await dbAccessor.removeStore('tenants', getters.userExtra.organizations[0], 'groups', docId)
  },
  getMembers ({commit, getters}) {
    commit('setLoadingMembers', true)
    if (!getters.activeOrganization) return Promise.resolve('not an org')
    /**
     * 
     * @param {firebase.firestore.DocumentSnapshot} doc 
     */
    const successFunc = doc => {
      const {users = []} = (doc.exists ? doc.data() : {})
      commit('setUsers', users.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1
        return 0
      }))
      commit('setLoadingMembers', false)
    }
    let unsubscribe = dbAccessor.queryRT(
      successFunc,
      (error) => {
        console.log(error)
        commit('setLoading', false)
        throw error
      },
      [],
      ['tenants', getters.activeOrganization, 'general', 'users']
    )
    commit('addTosubscribed', {usersForTenant: unsubscribe})
  },
  addUserToOfferByUpdateUserGroup ({commit, getters}, payload) {
    const {groupKeys = [], uids = []} = payload
    if (!Array.isArray(uids) || !uids.length) return

    const {offers = []} = getters
    return offers
      .filter(({selected}) => Array.isArray(selected.groups) && selected.groups.some(group => groupKeys.includes(group.key)))
      .map(({key}) => dbAccessor.updateFieldAddToSetArray(['offers', 'offers', 'active', key], 'userVisible', ...uids))
  },
  getInboundForDetails ({commit, getters}, payload) {
    let predicates = [
      {
        field: 'productId',
        compare: '==',
        value: payload.actionPayload.productId
      },
      {
        field: 'transactionType',
        compare: '==',
        value: 'inbound'
      },
      {
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }
    ]

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

    if (payload.predicates.predicateSelect) {
      predicates.push({
        field: `userKey`,
        compare: '==',
        value: payload.predicates.predicateSelect
      })
    }
    return dbAccessor.queryWithPagination(predicates, ['transaction'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  getProductInfo ({commit, getters}, payload) {
    return dbAccessor.queryStore('tenants', payload.tenantKey, 'inventory', payload.productId)
  },
  async addOrderShipment ({commit, dispatch, getters}, payload) {
    if ((getters.systemBalance.balance || 0) <= (getters.systemBalance.lowestBalance || 0)) throw Error('Can not create label, balance is too low.')
    Logger.log('addOrderShipment', payload)
    let {labels, shipments, keywords} = payload
    if (labels.length <= 0) {
      return {
        successLabels: [],
        errorLabels: []
      }
    }
    const payloadShipments = shipments.map(shipment => {
      shipment.tenantKey = getters.activeOrganization
      shipment.tenantName = getters.tenant.name
      shipment.orgEmail = getters.userExtra.email
      let payloadShipment = new Shipment(shipment)
      return {...payloadShipment.getData(), _key: payloadShipment._key}
    })

    return dbAccessor.callFunction('processOrders', {
      labels, 
      keywords, 
      shipments: payloadShipments,
      clientKey: getters.activeOrganization,
      clientName: getters.tenantLimitedInfo.name,
      isBeta: getters.isLabelBetaUser,
      type: 'addOrderShipment'
    })
      .then((rtn) => rtn.data)
  },
  async addShipment ({commit, dispatch, getters}, payload) {
    Logger.log('addShipment', payload)
    payload.tenantKey = getters.activeOrganization
    payload.tenantName = getters.tenant.name
    payload.orgEmail = getters.userExtra.email
    payload.creator = getters.userExtra.name
    const targetDraft = getters.shipmentsAndDrafts.find(item => item._key === payload.draftKey) || {}
    payload.draftComments = targetDraft.draftComments
    payload.exceptionRootFields = {}
    Object.entries(targetDraft).map(([key, val]) => {
      if (key.startsWith('lastRead_draftComments_')) {
        payload.exceptionRootFields[key] = val
      }
    })

    let {keywords, ...shipment} = payload
    let {products} = shipment
    let {shipDate = toPickerDateString(new Date())} = payload.selectedOrder || {}
    let payloadShipment = Shipment.newDoc(shipment)
    let productDictionary = {}
    products.forEach(product => {
      productDictionary[product.id] = productDictionary[product.id] || []
      productDictionary[product.id].push(product)
    })
    return ViteModel.startTransaction(async (transaction) => {
      const shipmentRef = dbAccessor.buildStoreQuery(['shipments', payload._key])
      let transactionGets = [
        transaction.get(shipmentRef),
        ...Object.keys(productDictionary).map((productId) => Product.getT(transaction, payload.tenantKey, productId))
      ]
      let [dbShipmentDoc, ...gets] = await Promise.all(transactionGets)
      if (payloadShipment.orderChange) {
        let {orderInfo, ...skuToFulfillQty} = payloadShipment.orderChange
        let orderDoc = await transaction.get(dbAccessor.buildStoreQuery([
          'tenants', 
          getters.activeOrganization,
          'orders',
          orderInfo._key
        ]))

        if (!orderDoc.exists) throw Error('Order doc not found.')
        let {items, status, shipments = []} = orderDoc.data()
        let orderShipment
        if (status === 'shipped') throw Error('Order has already been fulfilled.')
        items.forEach(item => {
          let {sku} = item
          if (skuToFulfillQty[sku]) {
            let {fulfillQty, orderItemId} = skuToFulfillQty[sku]
            item.quantityShipped += fulfillQty
            orderShipment = {
              key: payload._key,
              orderItemId,
              quantity: fulfillQty,
              shipDate,
              carrierCode: payloadShipment.carrier,
              carrierName: payloadShipment.carrier,
              trackingNumber: payloadShipment.trackingNum,
              status: 'pending'
            }
          }
          // over shipped
          if (item.quantityShipped > item.quantityPurchased) {
            throw Error(`OverShipped quantity for item sku: ${sku}`)
          }
        })
        shipments.push(orderShipment)
        let keywordsArr = keywords.split(' ')
        keywordsArr.pop()
        let fullKeywords = keywordsArr.join(' ')
        if (items.some(item => item.quantityPurchased - item.quantityShipped > 0)) {
          transaction.update(orderDoc.ref, dbAccessor.addUpdateDocTimestamp({
            status: 'partial', 
            items, 
            shipments,
            keywords: dbAccessor.fieldArrayUnion([...splitKeyword(keywords), fullKeywords]),
            processTime: new Date()
          }))
        } else {
          transaction.update(orderDoc.ref, dbAccessor.addUpdateDocTimestamp({
            status: 'closed', 
            items, 
            shipments,
            keywords: dbAccessor.fieldArrayUnion([...splitKeyword(keywords), fullKeywords]),
            processTime: new Date()
          }))
        }
      }
      if (!dbShipmentDoc.exists) {
        payloadShipment.insertOrUpdateT(transaction)
      } else {
        let {readyLabels} = dbShipmentDoc.data()
        payloadShipment.labels.forEach(item => {
          let targetLabel = readyLabels.find(label => label.orderId === item.orderId)
          if (targetLabel) {
            item.url = targetLabel.url
            item.trackingNum = targetLabel.trackingNumber
          }
        })
        payloadShipment.trackingNum = payloadShipment.labels
          .filter(item => item.trackingNum)
          .map(item => item.trackingNum)
          .join(' ')
        payloadShipment.keywords = [...payloadShipment.keywords, ...payloadShipment.trackingNum.split(' ')]
        if (payloadShipment.labels.every(item => item.url)) {
          dbAccessor.callFunction('processShipmentLabelFiles', {...payloadShipment.getData(), key: payload._key})
        }
        payloadShipment.insertOrUpdateT(transaction)
      }

      gets.forEach(originProduct => {
        if (!originProduct) {
          throw Error('missing-product')
        } else {
          const key = originProduct.getKey()
          productDictionary[key].forEach(product => {
            // update quantity
            originProduct.quantity -= product.toShip
            // update fbm
            let distribution = originProduct.distribution
            if (distribution[product.fbmKey].quantity >= product.toShip) {
              distribution[product.fbmKey].quantity -= product.toShip
              if (distribution[product.fbmKey].quantity === 0) { delete distribution[product.fbmKey] }
            } else {
              throw Error('quantity error')
            }
          })
          originProduct.updateT(transaction)
        }
      })

      payloadShipment.labels.forEach(label => {
        const labelRef = dbAccessor.buildStoreQuery(['labels', label.orderId.split('-')[1]])
        transaction.update(labelRef, {shipmentId: payloadShipment._key, hasShipment: true})
      })
    })
      .catch(error => {
        Logger.critical('Add Shipment', error.message)
        console.error(error)
        let newError = Error('new-shipment-error')
        newError.internalError = error
        throw newError
      })
      .then((data) => {
        let uploadMetadataPromises = payload.files.map(file => { 
          return ViteModel.updateFileMetadata(file.fullPath, {...file, shipmentKey: payload._key})
        })
        return Promise.all(uploadMetadataPromises)
      })
      .catch(error => {
        if (error.message === 'new-shipment-error') throw error
      })
  },
  getShipments ({commit, getters}) {
    let predicates = []
    if (getters.activeOrganization) {
      predicates = [{
        field: `tenantKey`,
        compare: '==',
        value: getters.activeOrganization
      }]
    } else if (getters.activeWarehouse) {
      predicates = [{
        field: `userKey`,
        compare: '==',
        value: getters.activeWarehouse
      }]
    } else {
      predicates = [{
        field: `userKey`,
        compare: '==',
        value: getters.uid
      }]
    }
    const cbFunc = (data) => {
      data.forEach(shipment => {
        const {name, content} = shipment.destination
        shipment.destinationForDisplay = name === '-- Other --' ? content : name
        shipment.keywordString += `, ${getters.organizationKeyToId.get(shipment.tenantKey)}, ${shipment.tenantName}`
      })
      commit('setShipments', data)
    }
    let unsubscribe = Shipment.getRT(cbFunc, predicates, [['isExpedited', true], ['createTime', false]])
    commit('addTosubscribed', {shipments: unsubscribe})
  },
  getArchivedShipments ({commit, getters}, payload) {
    let predicates = []
    if (getters.activeOrganization) {
      predicates = [{
        field: `tenantKey`,
        compare: '==',
        value: getters.activeOrganization
      }]
    } else if (getters.activeWarehouse) {
      predicates = [{
        field: `userKey`,
        compare: '==',
        value: getters.activeWarehouse
      }]
    } else {
      predicates = [{
        field: `userKey`,
        compare: '==',
        value: getters.uid
      }]
    }

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: `keywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText.toUpperCase()
      })
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

    if (payload.predicates && payload.predicates.predicateSelect) {
      if (getters.activeOrganization) {
        predicates.push({
          field: `userKey`,
          compare: '==',
          value: payload.predicates.predicateSelect
        })     
      } else {
        predicates.push({
          field: `tenantKey`,
          compare: '==',
          value: payload.predicates.predicateSelect
        })   
      }
    }
    return dbAccessor.queryWithPagination(predicates, ['archivedShipments'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
      .then(querySnapshots => querySnapshots.size ?
        {models: querySnapshots.docs.map(doc => {    
          return new ArchivedShipment(ArchivedShipment._extractDoc(doc)) 
        }),
        docs: querySnapshots} : {models: [], docs: querySnapshots})
  },
  cancelShipment  ({commit, getters}, payload) {
    return dbAccessor.callFunction('processShipment', {
      shipmentKey: payload._key,
      type: 'cancel'
    })
  },
  clearShipmentData ({state}) {
    state.subscribed.shipments && state.subscribed.shipments()
    state.subscribed.archivedShipments && state.subscribed.archivedShipments()
    delete state.subscribed.shipments
    delete state.subscribed.archivedShipments
    state.shipments = initialState.shipments
    state.archivedShipments = initialState.archivedShipments
  },
  getPaymentRequestForTenant ({commit, getters}) {
    commit('setLoading', true)
    let successFunc = (docs) => {
      let paymentRequests = []
      docs.forEach((doc) => {
        paymentRequests.push({...convertTimestampToDateInObj(doc.data()), paymentKey: doc.id})
      })
      commit('setPaymentRequests', paymentRequests)
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let predicates = [{
      field: 'tenantKey',
      compare: '==',
      value: getters.activeOrganization
    }]

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['paymentRequest'], 'createTime', false)
    commit('addTosubscribed', {paymentRequests: unsubscribe})
  },
  clearPaymentRequestData ({getters, state}) {
    getters.subscribed.paymentRequests && getters.subscribed.paymentRequests()
    delete getters.subscribed.paymentRequests
    state.paymentRequests = initialState.paymentRequests
  },
  getBalancesForTenant ({commit, getters}) {
    let predicates = [{
      field: `tenantKey`,
      compare: '==',
      value: getters.activeOrganization
    }]

    let successFunc = (docs) => {
      let balances = {}
      docs.forEach((doc) => {
        balances[doc.data().userKey] = doc.data()
        balances[doc.data().userKey].balanceKey = doc.id
      })
      commit('setBalance', balances)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['balance'])
    commit('addTosubscribed', {balances: unsubscribe})
  },
  getAllSystemBalances ({commit, getters}) {
    let successFunc = (docs) => {
      let balances = docs.docs.map((doc) => {
        return {...convertTimestampToDateInObj(doc.data()), clientKey: doc.id}
      })
      commit('setSystemBalances', balances)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['systemBalance'])
    commit('addTosubscribed', {systemBalance: unsubscribe})
  },
  clearBalancesData ({getters, state}) {
    getters.subscribed.balances && getters.subscribed.balances()
    delete getters.subscribed.balances
    state.balances = initialState.balances
  },
  makePayment ({commit, getters}, payload) {
    let nullfields = getNullFields(payload)
    if (nullfields.length > 0) {
      let error = `payload contains null value property (${nullfields.join(',')}). make payment canceled`
      return Promise.reject(Error(error))
    }
    
    let {userKey, userName, tenantKey, tenantName, amount, estimateDeliverDate, note = ''} = payload
    let paymentMethod = payload.method.displayName ? payload.method.displayName : ''
    let emailPayload = {userKey, userName, tenantKey, tenantName, amount, note, methodName: paymentMethod, estimateDeliverDate: toLocalDateString(estimateDeliverDate)}
    let emailNullfields = getNullFields(emailPayload)
    if (emailNullfields.length > 0) {
      let error = `payload contains null value property (${emailNullfields.join(',')}). make payment canceled`
      return Promise.reject(Error(error))
    }

    Logger.log('makePayment', payload)

    return dbAccessor.runInTransactionStore(async transaction => {
      let paymentRequestDoc = await transaction.get(dbAccessor.buildStoreQuery(['paymentRequest', payload.paymentKey]))
      if (!paymentRequestDoc.exists) throw Error('Payment request has been removed or canceled by the user')
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['balance', `${tenantKey}_${userKey}`]))
      if (!balanceDoc.exists) throw Error('balance doc is missing')
      let {total} = balanceDoc.data()
      total = addNumbers(total, -payload.amount)
      if (total < 0) throw Error('Payment amount exceeded total balance.')
      payload.newTotalBalance = total
      transaction.delete(paymentRequestDoc.ref)
      transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({total}))
      transaction.set(dbAccessor.getNewDocumentKey('transaction'), dbAccessor.addNewDocTimestamp({...payload, transactionType: 'payment', isPayment: true, isPending: false}))
    })
      .then(() => {
        dbAccessor.callFunction('notifyPaymentFinished', emailPayload)
        console.log('Payment success!')
      })
  },
  getPendingTransactionForTenant ({commit, getters}) {
    commit('setLoading', true)
    let predicates = [
      {
        field: `tenantKey`,
        compare: '==',
        value: getters.activeOrganization
      },
      {
        field: `isPending`,
        compare: '==',
        value: true
      }
    ]
    return dbAccessor.queryWithPredicates(predicates, ['transaction'], 'pendingEndDate', false)
      .then((docs) => {
        let pendingTransactions = []
        docs.forEach((doc) => {
          pendingTransactions.push(convertTimestampToDateInObj(doc.data()))
        })
        commit('setPendingTransactions', pendingTransactions)
        commit('setLoading', false)
      })
  },
  getHistoryTransactionForTenant ({commit, getters}, payload) {
    let predicates = [
      {
        field: `tenantKey`,
        compare: '==',
        value: getters.activeOrganization
      }
    ]

    if (payload && payload.predicates) {
      if (payload.predicates.predicateCheckBox) {
        predicates.push({
          field: `transactionType`,
          compare: '==',
          value: 'payment'
        })
      }
      if (payload.predicates.predicateSelect) {
        predicates.push({
          field: `userKey`,
          compare: '==',
          value: payload.predicates.predicateSelect
        })
      }
      if (payload.predicates.predicateSwitch) {
        payload.startDate && payload.endDate && (predicates = [...predicates, {
          field: `estimateDeliverDate`,
          compare: '>=',
          value: payload.startDate
        },
        {
          field: `estimateDeliverDate`,
          compare: '<=',
          value: payload.endDate
        }])
      } else {
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
      }
    }

    let orderBy = 'createTime'
    payload && payload.predicates && payload.predicates.predicateSwitch && (orderBy = 'estimateDeliverDate')

    return dbAccessor.queryWithPagination(predicates, ['transaction'], orderBy, true, payload && payload.startAfter, payload && payload.limit)
  },
  cancelTenantPaymentRequest ({commit, getters}, payload) {
    Logger.log('cancelUserPaymentRequest', payload)
    let {tenantKey, userKey} = payload
    return dbAccessor.runInTransactionStore(async transaction => {
      let paymentRequestDoc = await transaction.get(dbAccessor.buildStoreQuery(['paymentRequest', payload.paymentKey]))
      if (!paymentRequestDoc.exists) throw Error('Payment request has been removed or canceled by the user')
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['balance', `${tenantKey}_${userKey}`]))
      if (!balanceDoc.exists) throw Error('balance doc is missing')
      let {released} = balanceDoc.data()
      released = addNumbers(released, payload.amount)

      transaction.delete(paymentRequestDoc.ref)
      transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({released}))
    })
  },
  addAdjustBalance ({commit, getters}, payload) {
    Logger.log('addAdjustBalance', payload)
    let balanceKey = `${getters.activeOrganization}_${payload.userKey}`
    return dbAccessor.runInTransactionStore(async transaction => {
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['balance', balanceKey]))
      if (!balanceDoc.exists) throw Error('balance doc is missing')
      let {total, released} = balanceDoc.data()
      released = released + payload.amount
      total = total + payload.amount
      transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({total, released}))
      transaction.set(dbAccessor.getNewDocumentKey('transaction'), dbAccessor.addNewDocTimestamp({...payload, newTotalBalance: total}))
      return 'success'
    })
  },
  async adjustSystemBalance ({commit, getters}, payload) {
    const {clientKey, amount, note, clientName, keywords, type} = payload
    const balanceRef = dbAccessor.buildStoreQuery(['systemBalance', clientKey])
    const operator = (getters.user && getters.user.displayName) || 'root admin'
    const getCurTimeStr = async () => {
      const rtn = await dbAccessor.callFunction('getServerTime', {})
      const currentTime = new Date(rtn.data)
      const curKeyStr = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}`
      return curKeyStr
    }
    const curKeyStr = type === 'fee' ? (await getCurTimeStr()) : ''

    return dbAccessor.runInTransactionStore(async transaction => {
      let balanceDoc = await transaction.get(balanceRef)
      if (!balanceDoc.exists) {
        if (type === 'fee') {
          transaction.set(balanceRef, dbAccessor.addNewDocTimestamp({
            balance: toMoney(amount),
            expenseHistory: [{
              dateKeyStr: curKeyStr,
              expense: toMoney(-amount)
            }],
            clientName
          }))
        } else {
          transaction.set(balanceRef, dbAccessor.addNewDocTimestamp({
            balance: toMoney(amount),
            clientName
          }))
        }
        transaction.set(dbAccessor.getNewDocumentKey('systemTransactions'), dbAccessor.addNewDocTimestamp({
          ...payload, 
          newBalance: toMoney(amount),
          type: 'adjust',
          subtype: type,
          keywords: [type, ...keywords, `${amount}`],
          note,
          clientKey,
          operator
        }))
      } else {
        let {balance = 0, expenseHistory = []} = balanceDoc.data()
        const newBalance = addNumbers(balance, amount)

        if (type === 'fee') {
          let tailMonth = expenseHistory[expenseHistory.length - 1]
          if (tailMonth && curKeyStr === tailMonth.dateKeyStr) {
            tailMonth.expense = addNumbers(-amount, tailMonth.expense || 0)
          } else {
            expenseHistory.push({
              dateKeyStr: curKeyStr,
              expense: toMoney(-amount)
            })
          }
    
          if (expenseHistory.length > 12) {
            expenseHistory.shift()
          }
  
          transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({
            balance: newBalance, 
            expenseHistory
          }))
        } else {
          transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({
            balance: newBalance
          }))
        }
        transaction.set(dbAccessor.getNewDocumentKey('systemTransactions'), dbAccessor.addNewDocTimestamp({
          ...payload, 
          newBalance,
          type: 'adjust',
          subtype: type,
          keywords: [type, ...keywords, `${amount}`],
          note,
          clientKey,
          operator
        }))
      }
    })
  },
  getTenantLimitedInfo ({getters, commit}) {
    let successFunc = (doc) => {
      commit('setTenantLimitedInfo', doc.data())
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenantLimitedInfo', getters.activeOrganization])
    commit('addTosubscribed', {tenantLimitedInfo: unsubscribe})
  },
  async changeTenantLimitedInfo ({getters, dispatch}, payload) {
    await dbAccessor.updateFieldsStore(payload, 'tenantLimitedInfo', getters.activeOrganization)
    if (payload.enableAmazonSites) {
      dispatch('getAmazonSites')
    }
    return 'done'
  },
  changeWarehouseLimitedInfo ({getters, commit}, payload) {
    Object.keys(payload.generalSettings).forEach(key => {
      if (payload.generalSettings[key] === undefined) {
        payload.generalSettings[key] = null
      }
    })
    return dbAccessor.updateFieldsStore(payload, 'warehouses', getters.activeWarehouse)
  },
  getWarehousesForTenant ({getters, commit, dispatch}, payload) {
    let tenantKey = payload
    let subscribes = getters.subscribed

    subscribes['warehouses'] && (subscribes['warehouses']())

    return new Promise((resolve, reject) => {
      let successFunc = (doc) => {
        let warehouses = doc.data().warehouses
        warehouses.forEach(warehouse => {
          warehouse.sites.forEach(site => {
            warehouse.orgId && (site.orgId = warehouse.orgId)
          })
          if (warehouse.warehouseName === 'self') {
            warehouse.warehouseName = 'Others'
          }
        })
        warehouses.sort((a, b) => {
          if (a.warehouseName === 'Others') {
            return 1
          }
          return -1
        })
  
        let oldWarehouses = getters.warehouses
        let needToResubscribePromotion = (warehouses.length !== oldWarehouses.length) || 
          warehouses.some((item, index) => item.warehouseKey !== oldWarehouses[index].warehouseKey)
  
        commit('setWarehouses', warehouses)
        needToResubscribePromotion && dispatch('getWareHousesPromotionsForTenant')
        resolve('subscribed')
      }
  
      let errorFunc = (error) => {
        console.error(`Warehouses RT error`, error)
        reject(Error(`Warehouses RT error`))
      }
  
      let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenantLimitedInfo', tenantKey])
      commit('addTosubscribed', {warehouses: unsubscribe})
    })
  },
  getWarehousesBillingsForTenant ({getters, commit}) {
    if (!getters.activeOrganization) {
      return
    }

    const successFunc = (docs) => {
      let billings = docs.docs.map(doc => {
        return {key: doc.id, ...doc.data()}
      })
      commit('setWarehouseBillings', billings)
    }
    const errorFunc = error => {
      console.log(error)
    }
    const predicates = [{
      field: 'tenantKey',
      compare: '==',
      value: getters.activeOrganization
    }]
    let unsubscribe = dbAccessor.queryCollectionGroupRT(successFunc, errorFunc, predicates, 'billings')
    commit('addTosubscribed', {warehousesBillings: unsubscribe})
  },
  getWareHousesPromotionsForTenant ({getters, commit}) {
    // unsubscribe first, this will be trigger whenever warehouse list changes
    let subscribes = getters.subscribed
    Object.keys(subscribes).forEach(key => {
      if (key.startsWith('warehousesPromotion_') && subscribes[key]) {
        subscribes[key]()
        subscribes[key] = null
      }
    })

    // now re-subscribe
    let successFunc = (promotionsDocs) => {
      let today = (new Date()).getTime() / 1000
      let promotionsMap = new Map([...getters.warehousesPromotionsMap])
      let promotionWarehouseKey = promotionsDocs._originalQuery.path.segments[1]
      let activePromotions = []
      if (!promotionsDocs.empty) {
        activePromotions = promotionsDocs.docs.map(promotionDoc => {
          let promotion = promotionDoc.data()
          promotion.key = promotionDoc.id
          return promotion
        }).filter(promotion => (promotion.startDate && promotion.startDate.seconds <= today)
          && !(!promotion.isAllowMultiple && promotion.depositList 
            && promotion.depositList.includes(getters.activeOrganization)
          )
        )
      }
      if (activePromotions.length > 0) {
        promotionsMap.set(promotionWarehouseKey, convertTimestampToDateInObj(activePromotions))
      } else if (promotionsMap.has(promotionWarehouseKey)) {
        promotionsMap.delete(promotionWarehouseKey)
      }
      commit('setWarehousesPromotionsMap', promotionsMap)
    }

    let errorFunc = error => {
      console.error(error)
    }
    
    getters.allPreferredWarehouses.forEach(warehouse => {
      let unsubscribe = dbAccessor.queryStoreRT(
        successFunc, errorFunc, [{
          field: 'endDate',
          compare: '>=',
          value: new Date()
        }],
        'warehouses', warehouse.warehouseKey, 'promotions')
      commit('addTosubscribed', {['warehousesPromotion_' + warehouse.warehouseKey]: unsubscribe})
    })
  },
  updateTenantReadList ({getters, commit}, readListMap) {
    let promiseArr = []
    readListMap.forEach((promotions, warehouseKey) => {
      promiseArr = promiseArr.concat(
        promotions.map(promotionId => {
          return dbAccessor.updateFieldAddToSetArray(
            ['warehouses', warehouseKey, 'promotions', promotionId],
            'readList', getters.activeOrganization
          )
        })
      )
    })

    return Promise.all(promiseArr)
  },
  async getWarehouseLimitedInfoForTenant ({getters, commit}) {
    const successFunc = (warehouseKey) => {
      /**
       * @param {firebase.firestore.QueryDocumentSnapshot} queryDocSnapshot 
       */
      function success (queryDocSnapshot) {
        if (queryDocSnapshot.exists) {
          const { 
            otherRates = {}, 
            rates = {}, 
            stripePublicLiveKey = '', 
            stripePublicTestKey = '', 
            warehouseName = ''
          } = queryDocSnapshot.data()
          let warehouseLimitedInfoForTenant = getters.warehouseLimitedInfoForTenant
          const newInfos = warehouseLimitedInfoForTenant.filter(({key}) => key !== warehouseKey)
          newInfos.push({
            otherRates, rates, stripePublicLiveKey, stripePublicTestKey, warehouseName, key: warehouseKey
          })
          commit('setWarehouseLimitedInfoForTenant', newInfos)
        }
      }
      return success
    }
    let promises = getters.warehouses
      .filter(warehouse => warehouse.warehouseName !== 'Others')
      .map(warehouse => {
        let {warehouseKey} = warehouse
        return dbAccessor.queryStoreRT(
          successFunc(warehouseKey), 
          (error) => {
            console.log(error)
            commit('setLoading', false)
            throw error
          },
          [],
          'warehouseLimitedInfo', warehouseKey
        )
      })
    promises.forEach((unsubscribe, index) => {
      commit('addTosubscribed', {['warehouseLimitedInfo_' + index]: unsubscribe})
    })
  },
  getAllWarehouses ({getters, commit}) {
    const predicates = [{
      field: 'isListed',
      compare: '==',
      value: true
    }]
    return dbAccessor.queryWithPredicatesStore(predicates, 'warehouseLimitedInfo')
      .then(docs => {
        let allWarehouses = []
        docs.forEach(doc => allWarehouses.push({...doc.data(), warehouseKey: doc.id}))
        return allWarehouses
      })
  },
  addSelfSiteForTenant ({getters, commit}, payload) {
    return dbAccessor.queryStore('tenantLimitedInfo', getters.activeOrganization)
      .then(doc => {
        let warehouses = doc.data().warehouses
        warehouses[0].sites.push(payload)
        let newPayload = {
          warehouses: warehouses
        }
        return dbAccessor.updateFieldsStore(newPayload, 'tenantLimitedInfo', getters.activeOrganization)
      })
  },
  editSelfSiteForTenant ({getters, commit}, payload) {
    let {newAddress, oldAddress} = payload
    return dbAccessor.queryStore('tenantLimitedInfo', getters.activeOrganization)
      .then(doc => {
        let warehouses = doc.data().warehouses
        let siteIndex = warehouses[0].sites.findIndex(site => site.siteName === oldAddress.siteName)
        warehouses[0].sites[siteIndex] = newAddress
        let newPayload = {
          warehouses: warehouses
        }
        return dbAccessor.updateFieldsStore(newPayload, 'tenantLimitedInfo', getters.activeOrganization)
      })
  },
  deleteSelfSiteForTenant ({getters, commit}, payload) {
    return dbAccessor.queryStore('tenantLimitedInfo', getters.activeOrganization)
      .then(doc => {
        let warehouses = doc.data().warehouses
        warehouses[0].sites = warehouses[0].sites.filter(site => site.siteName !== payload.siteName)
        let newPayload = { warehouses: warehouses }
        return dbAccessor.updateFieldsStore(newPayload, 'tenantLimitedInfo', getters.activeOrganization)
      })
  },
  processPackageFile ({commit, getters}, payload) {
    let data = {tenantKey: getters.activeOrganization, file: payload}
    return dbAccessor.callFunction('importPackagesFromFile', data)
      .then(res => {
        return res.data
      })
  },
  checkTenantDistribution ({getters}, {siteName}) {
    let {products} = getters
    let siteAbrev = `self-${siteName}`
    let warehouseSites = new Set(products
      .map(item => item.distribution ? Object.values(item.distribution)
        .map(distribution => distribution.warehouseSite) : []).flat())
    return warehouseSites.has(siteAbrev)
  },
  searchPackages ({commit, getters}, payload) {
    return getters.activeWarehouse ?
      dbAccessor.queryWithPredicatesStore(payload.predicates, ...payload.path) :
      dbAccessor.queryCollectionGroup(payload.predicates, 'packages')
  }, 
  searchPackagesPagination ({commit, getters}, payload) {
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
    if (getters.activeOrganization) {
      predicates.push({
        field: 'organizationKey',
        compare: '==',
        value: getters.activeOrganization
      })
    }
    if (payload.predicates && payload.predicates.predicateText) {
      let textArr = payload.predicates.predicateText.split('*')
      if (textArr.length === 2) {
        predicates.push({
          field: 'sku',
          compare: '==',
          value: textArr[1]
        })
      } else {
        textArr = payload.predicates.predicateText.split('%')
        if (textArr.length === 2) {
          predicates.push({
            field: 'keywords',
            compare: 'array-contains',
            value: textArr[1].toUpperCase().trim()
          })
        } else {
          predicates.push({
            field: 'upc',
            compare: '==',
            value: textArr[0]
          })
        }
      }
    }
    if (payload.unlinked) {
      predicates.push({
        field: 'isAddedToInventory',
        compare: '==',
        value: false
      })
    }
    if (payload.predicates.predicateSelect) {
      predicates.push({
        field: `organizationKey`,
        compare: '==',
        value: payload.predicates.predicateSelect
      })
    }

    if (payload.predicates.actionPredicates) {
      predicates = [...predicates, ...payload.predicates.actionPredicates]
    }
    return (getters.activeOrganization ? 
      dbAccessor.queryCollectionGroupWithPagination(
        predicates, 'packages', 'createTime', true, 
        payload && payload.startAfter,
        payload && payload.limit
      ) :
      dbAccessor.queryWithPagination(
        predicates, ['warehouses', getters.activeWarehouse, 'packages'], 
        'createTime', true, payload && payload.startAfter, 
        payload && payload.limit
      )
    )
      .then(querySnapshots => querySnapshots.size ?
        {
          models: querySnapshots.docs.map(doc => {
            const warehouseKey = doc.ref.path.split('/')[1]       
            return new Package(Package._extractDoc(doc), warehouseKey, getters.uid) 
          }),
          docs: querySnapshots
        } : {models: [], docs: querySnapshots}
      )
  },
  generateInvitationCode ({commit, getters}) {
    let invitationCode = Math.random().toString(36).substr(2)
    let payload = {...getters.tenant, invitationCode}
    commit('setTenant', payload)
    return dbAccessor.updateFieldsStore(payload, 'tenants', getters.activeOrganization)
  },
  getReportLostTenant ({commit, getters}) {
    let predicates = [{
      field: `tenantKey`,
      compare: '==',
      value: getters.activeOrganization
    }]

    let successFunc = (docs) => {
      let reportLost = docs.docs.map(doc => {
        let reportDoc = convertTimestampToDateInObj(doc.data())
        return {reportKey: doc.id, ...reportDoc}
      })
      commit('setReportLost', reportLost)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['reportLost'], 'createTime', false)
    commit('addTosubscribed', {reportLost: unsubscribe})
  },
  clearReportLostData ({getters, state}) {
    getters.subscribed.reportLost && getters.subscribed.reportLost()
    delete getters.subscribed.reportLost
    state.reportLost = initialState.reportLost
  },
  acceptReport ({getters, commit}, payload) {
    Logger.log('acceptReport', payload)
    let tenantRef = dbAccessor.buildStoreQuery(['tenants', payload.tenantKey, 'inventory', payload.productId])
    let reportRef = dbAccessor.buildStoreQuery(['reportLost', payload.reportKey])
    let balanceRef = dbAccessor.buildStoreQuery(['balance', `${payload.tenantKey}_${payload.userKey}`])
    let transactionRef = dbAccessor.buildStoreQuery(['transaction']).doc()
    let userRef = dbAccessor.buildStoreQuery(['userLimitedInfo', payload.userKey, 'inventory', payload.productKey])
    let relatedReportLost = getters.reportLost.filter(rl => rl.productKey === payload.productKey)

    return dbAccessor.runInTransactionStore(transaction => {
      return Promise.all([transaction.get(tenantRef), transaction.get(balanceRef), transaction.get(userRef), transaction.get(reportRef)])
        .then(([tenantDoc, balanceDoc, userDoc, reportDoc]) => {
          if (!reportDoc.exists) throw Error('missing report.')
          let newPayload = {}
          let balance = balanceDoc.data()
          balance.total = addNumbers(balance.total, -payload.quantity * payload.price)
          balance.released = addNumbers(balance.released, -payload.quantity * payload.price)
          let { distribution, quantity: storeQuantity } = tenantDoc.data()
          newPayload.quantity = storeQuantity - payload.quantity
          // check quantity 
          let tenantDistributionKey = Buffer.from(payload.productId + payload.userKey + payload.warehouseSite).toString('base64')
          if (distribution[tenantDistributionKey].quantity === payload.quantity) {
            delete distribution[tenantDistributionKey]
          } else {
            distribution[tenantDistributionKey].quantity -= payload.quantity
          }
          newPayload.distribution = distribution
          transaction.delete(reportRef)
          transaction.update(balanceRef, dbAccessor.addUpdateDocTimestamp(balance))
          transaction.set(transactionRef, dbAccessor.addNewDocTimestamp({newTotalBalance: balance.total, amount: payload.price * payload.quantity, ...payload, transactionType: 'reportLost', tenantName: getters.tenant.name}))
          transaction.update(tenantRef, dbAccessor.addUpdateDocTimestamp(newPayload))
          if (userDoc.data().quantity === 0 && relatedReportLost.length <= 1) {
            return transaction.delete(userRef)
          }
          if (userDoc.data().distribution[payload.distributionKey] === 0) {
            delete userDoc.data().distribution[payload.distributionKey]
            return transaction.update(userRef, dbAccessor.addUpdateDocTimestamp({distribution: userDoc.data().distribution}))
          }
          return transaction.update(userRef, dbAccessor.addUpdateDocTimestamp({}))
        })
    })
      .catch(error => {
        Logger.critical('reportLost', {error: error.message, ...payload})
      })
  },
  cancelReportTenant ({getters, commit}, payload) {
    Logger.log('cancelReport', payload)
    let { distributionKey, quantity: reportLostQty, warehouseSite } = payload
    let userRef = dbAccessor.buildStoreQuery(['userLimitedInfo', payload.userKey, 'inventory', payload.productKey])
    let reportRef = dbAccessor.buildStoreQuery(['reportLost', payload.reportKey])
    
    return dbAccessor.runInTransactionStore(transaction => {
      return transaction.get(userRef)
        .then(doc => {
          let newPayload = {}
          let { distribution } = doc.data()
          newPayload.quantity = doc.data().quantity + reportLostQty
          if (distribution && distribution[distributionKey] && distribution[distributionKey].quantity) {
            distribution[payload.distributionKey].quantity += payload.quantity
          } else {
            distribution[payload.distributionKey] = { quantity: reportLostQty, warehouseSite }
          }
          newPayload.distribution = distribution
          transaction.delete(reportRef)
          return transaction.update(userRef, dbAccessor.addUpdateDocTimestamp(newPayload))
        })
    })
  },
  addDestination ({commit, getters}, payload) {
    return dbAccessor.updateFieldAddToArrayStore('destinations', payload, 'tenants', getters.activeOrganization)
  },
  editDestination ({commit, getters}, payload) {
    let ref = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
    return dbAccessor.runInTransactionStore(transaction => {
      return transaction.get(ref)
        .then(doc => {
          let tenant = doc.data()
          let {index, ...info} = payload
          tenant.destinations[index] = info
          return transaction.update(ref, dbAccessor.addUpdateDocTimestamp({destinations: tenant.destinations}))
        })
    })
  },
  deleteDestination ({commit, getters}, payload) {
    let ref = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
    return dbAccessor.runInTransactionStore(transaction => {
      return transaction.get(ref)
        .then(doc => {
          let tenant = doc.data()
          let {index} = payload
          tenant.destinations.splice(index, 1)
          tenant.destinations = [...tenant.destinations]
          return transaction.update(ref, dbAccessor.addUpdateDocTimestamp({destinations: tenant.destinations}))
        })
    })
  },
  addInstruction ({commit, getters}, payload) {
    return dbAccessor.updateFieldAddToArrayStore('instructions', payload, 'tenants', getters.activeOrganization)
  },
  editInstruction ({commit, getters}, payload) {
    let ref = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
    return dbAccessor.runInTransactionStore(transaction => {
      return transaction.get(ref)
        .then(doc => {
          let tenant = doc.data()
          let {index, ...info} = payload
          tenant.instructions[index] = info
          return transaction.update(ref, dbAccessor.addUpdateDocTimestamp({instructions: tenant.instructions}))
        })
    })
  },
  deleteInstruction ({commit, getters}, payload) {
    let ref = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
    return dbAccessor.runInTransactionStore(transaction => {
      return transaction.get(ref)
        .then(doc => {
          let tenant = doc.data()
          let {index} = payload
          tenant.instructions.splice(index, 1)
          tenant.instructions = [...tenant.instructions]
          return transaction.update(ref, dbAccessor.addUpdateDocTimestamp({instructions: tenant.instructions}))
        })
    })
  },
  submitPayRequest ({commit, getters}, payload) {
    let {paymentType} = payload
    payload.tenantKey = getters.activeOrganization || ''
    if (!paymentType) throw Error('invalid-payment-type')
    return dbAccessor.callFunction('makePayment', payload)
  },
  mergeProducts ({commit, getters}, payload) {
    let {curProductId, targetProductId} = payload
    return dbAccessor.callFunction('mergeTwoProducts', {
      currentProductId: curProductId,
      targetProductId,
      tenantKey: getters.activeOrganization
    }).then(() => {
      return Logger.changeLog({
        beforeValue: payload.beforeValue, 
        actionPayload: payload.payload,
        actionName: 'mergeProducts',
        categories: ['inventory'],
        keys: [curProductId, targetProductId],
        keywords: payload.keywords
      })
    })
  },
  getTenantAnnouncements ({commit, getters}, payload) {
    const cbFunc = (data) => {
      commit('setTenantAnnouncements', data)
    }
    let unsubscribe = Announcement.getByTenantRT(cbFunc, getters.activeOrganization)
    commit('addTosubscribed', {tenantAnnouncements: unsubscribe})
  },
  addPackageReportTenant ({commit, getters}, payload) {
    let report = new PackageReportTenant(payload, getters.activeOrganization)
    return report.insert()
  },
  deletePackageReportTenant ({commit, getters}, payload) {
    let report = new PackageReportTenant(payload, getters.activeOrganization)
    return report.delete()
  },
  loadPackageReportsTenant ({commit, getters}) {
    const cbFunc = (data) => {
      commit('setPackageReports', data)
    }
    let unsubscribe = PackageReportTenant.getRT(cbFunc, getters.activeOrganization, [])
    commit('addTosubscribed', {packageReports: unsubscribe})
  },
  getPendingProductTransfer ({dispatch, commit, getters}) {
    let predicates = [{
      field: 'isPending',
      compare: '==',
      value: true
    }, {
      field: `involvedKeys`,
      compare: 'array-contains',
      value: getters.activeOrganization || getters.activeWarehouse
    }]

    const cbFunc = (data) => {
      commit('setPendingProductTransfers', data)
      if (data.length) {
        dispatch('addNotification', {
          key: 'newPendingTransfers',
          displayName: 'pending product transfer',
          pathName: 'product transfer',
          path: '/productTransferTenant'
        })
      } else commit('removeNotification', {key: 'newPendingTransfers'})
    }
    let unsubscribe = ProductTransfer.getRT(cbFunc, predicates, [['createTime', false]])
    commit('addTosubscribed', {pendingProductTransfers: unsubscribe})
  },
  async createProductTransfer ({commit, getters}, payload) {
    let {productsSelected, toName, note, files, userKey, userName, to} = payload
    
    let {warehouseSite, warehouseKey, siteName, uid} = productsSelected[0]
    if (productsSelected.some(item => item.warehouseSite !== warehouseSite)) throw Error('Transfer items must belong to the same site.')
    if (productsSelected.some(item => !item.toShip)) throw Error('Transfer quantity must greater than 0')
    if (productsSelected.some(item => !(item.unitPrice >= 0))) throw Error('Unit price must be a number greater or equal to 0.')
    if (productsSelected.some(item => item.unitPrice !== 0 && !item.unitPrice)) throw Error('Unit price is missing')
    let transferInfo = {
      note,
      location: siteName,
      from: getters.activeOrganization,
      fromName: getters.userExtra.name,
      toName: toName.trim(),
      items: productsSelected.map(item => {
        let {warehouseSite, warehouseKey, siteName, userName, uid, productId, toShip, unitPrice, upc, name, id, condition, asin, fbmKey} = item
        return {warehouseSite, warehouseKey, siteName, userName, uid, productId, toShip, unitPrice, upc, name, id, condition, asin, fbmKey}
      }),
      warehouseKey,
      warehouseSite,
      userName,
      uid,
      warehouseName: productsSelected[0].userName,
      files,
      userKey,
      to
    }
    let transfer = new ProductTransfer(transferInfo)
    return transfer.insert()
  },
  addTransferToInventory ({commit, getters}, payload) {
    let transfer = new ProductTransfer(payload)
    return transfer.addToInventory()
  },
  getHistoryTransfers ({commit, getters}, payload) {
    let {startDate, endDate} = payload
    let predicates = []

    if (payload && payload.predicates && payload.predicates.actionPredicates) {
      predicates = [...predicates, ...payload.predicates.actionPredicates]
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
    return dbAccessor.queryWithPagination(predicates, ['transferTransactions'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  sendAnnouncementEmails ({commit}, payload) {
    return dbAccessor.callFunction('sendAnnouncementEmails', payload)
  },
  getActiveSupports ({getters, commit}, payload) {
    const uid = getters.user.uid 
    const checkSCase = (sCase) => {
      return (sCase.comments.length === 0 && 
        sCase['lastRead_' + uid] &&
        sCase['lastRead_' + uid].getTime() < sCase.createTime.getTime()
      ) ||
      (sCase.comments.length > 0 &&
        sCase['lastRead_' + uid] &&
        sCase['lastRead_' + uid].getTime() < sCase.comments[sCase.comments.length - 1].createTime.getTime()
      )
    }

    const cbFunc = (data) => {
      let isNewPendingCase = false
      let isNewInProgressComment = false
      let notifications = [...getters.notifications.filter(({key}) => key !== 'newPendingSupportCase' && key !== 'newInProgressSupportComments')]
      for (let sCase of data) {
        if (!isNewPendingCase && 
          sCase.status === 'pending' &&
          getters.activeWarehouse && !sCase.agentUid
        ) {
          notifications.push({
            key: 'newPendingSupportCase',
            displayName: 'unassigned support case',
            pathName: 'support',
            path: '/support'
          })
          isNewPendingCase = true
        }
        if (!isNewInProgressComment && (
          (!sCase['lastRead_' + uid] && sCase.comments.length) ||
          checkSCase(sCase)
        )) {
          notifications.push({
            key: 'newInProgressSupportComments',
            displayName: 'new support comment',
            pathName: 'support',
            path: '/support'
          })
          isNewInProgressComment = true
        }
      }

      commit('setNotifications', notifications)
      commit('setSupports', data)
    }

    let unsubscribe
    if (getters.activeOrganization) {
      unsubscribe = Support.getByTenantRT(cbFunc, getters.activeOrganization, getters.user.uid)
    } else if (getters.activeWarehouse) {
      unsubscribe = Support.getByWarehouseRT(cbFunc, getters.activeWarehouse, getters.user.uid)
    } else if (getters.user.isAdmin) {
      unsubscribe = Support.getByAdminRT(cbFunc, getters.user.uid)
    }
    commit('addTosubscribed', {supportsOnSubscribed: unsubscribe})
  },
  addSupport ({commit}, payload) {
    const newSupport = new Support(payload)
    return newSupport.insert()
  },
  cancelSupport ({commit}, payload) {
    return (payload instanceof Support) ? payload.delete() : Support.deleteByKey(payload._key)
  },
  updateSupport ({commit}, payload) {
    const {key, ...fields} = payload
    return Support.updateByKey(fields, key)
  },
  resolveSupport ({commit, getters}, payload) {
    const {key, keywords, details, ...rest} = payload
    const fields = {
      ...rest,
      internalComments: dbAccessor.fieldArrayUnion([{
        content: details,
        createTime: new Date(),
        name: (getters.userExtra && getters.userExtra.name) || 'IT support',
        userKey: getters.uid,
        isResolution: true
      }]),
      keywordDisplay: keywords,
      keywords: dbAccessor.fieldArrayUnion([
        ...payload.resolveTypes.map(type => `RES-${type.split(' ').join('-').toUpperCase()}`),
        ...splitKeyword(keywords).map(item => item.toUpperCase())
      ])
    }
    return Support.updateByKey(fields, key)
  },
  getDoneSupports ({getters, commit}, payload) {
    let predicates = [{ field: `status`, compare: '==', value: 'closed' }]
    if (getters.activeOrganization) {
      predicates.push({ field: `tenantKey`, compare: '==', value: getters.activeOrganization })
    } else if (getters.activeWarehouse) {
      predicates.push({ field: `warehouseKey`, compare: '==', value: getters.activeWarehouse })
    }
    
    payload.startDate && payload.endDate && (
      predicates = [
        ...predicates,
        { field: `lastModifiedTime`, compare: '>=', value: payload.startDate },
        { field: `lastModifiedTime`, compare: '<=', value: payload.endDate }
      ]
    )
    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: 'keywords', compare: 'array-contains', value: payload.predicates.predicateText.toUpperCase().trim()
      })
    }

    if (payload.predicates && payload.predicates.predicateSelect && getters.activeOrganization) {
      predicates.push({ field: `warehouseKey`, compare: '==', value: payload.predicates.predicateSelect })
    }

    if (getters.user.isAdmin) {
      predicates.push({ 
        field: `warehouseKey`, 
        compare: '==', 
        value: 'system'
      })
    }
    return dbAccessor.queryWithPagination(predicates, ['supports'], 'lastModifiedTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  async validateUser ({commit, getters, dispatch}, payload) {
    let {tenantName, userName, warehouseKey} = payload
    let predicates = (value) => [{
      field: 'name',
      compare: '==',
      value: value
    }]
    let [userDocs, tenantKey] = await Promise.all([dbAccessor.queryWithPredicatesStore(predicates(userName), 'users'), dispatch('validateTenant', {tenantName, warehouseKey})])

    if (userDocs.size !== 1) return Promise.reject(Error('Balance receiver does not exist, please double check.'))

    let {workfor = {}} = userDocs.docs[0].data()
    return {result: workfor[tenantKey] === 3, userKey: userDocs.docs[0].id, to: tenantKey}
  },
  async validateTenant ({commit, getters}, payload) {
    let {tenantName, warehouseKey} = payload
    let predicates = [{
      field: `name`,
      compare: '==',
      value: tenantName
    }]
  
    let targetTenantDoc = await dbAccessor.queryWithPredicatesStore(predicates, 'tenantLimitedInfo')
    if (targetTenantDoc.size > 1) throw Error('Same name found from different organizations, please contact IT support.')
    if (targetTenantDoc.size === 0) throw Error('Organization name does not exist.')
    if (targetTenantDoc.docs[0].id === getters.activeOrganization || !warehouseKey) throw Error('Self transfers are not supported.')
    let {warehouses} = targetTenantDoc.docs[0].data()
    if (!warehouses.some(item => item.warehouseKey === warehouseKey)) throw Error(`Recipient organization hasn't signup this warehouse.`)
    
    return targetTenantDoc.docs[0].id
  },
  cancelTransfer ({commit, getters}, payload) {
    return payload.delete()
  },
  updatePackageOrgNote ({commit, getters}, payload) {
    const {warehouseSite, orgNote, pkgKey} = payload
    // get warehouseKey by warehouse Site
    let warehouseKey
    if (warehouseSite) {
      warehouseKey = (getters.warehouses.find(warehouse =>
        (warehouse.sites || []).some(site => site.key === warehouseSite)
      ) || {}).warehouseKey
      if (!warehouseKey) throw Error('update-org-note-invalid-warehouseKey')
    } else {
      warehouseKey = getters.activeOrganization
    }
    
    return dbAccessor.updateFieldsStore({orgNote},
      'warehouses', warehouseKey, 'packages', pkgKey
    )
  },
  /** 
   * Only for offer in frontend
   * @param {{``
   *  productId: string,
   *  data: {
   *    offerId: string,
   *    price: number,
   *    allowSelf: boolean,
   *    bonus?: number
   *  }
   * }} payload */
  async setProductPriceHistoryOfferNode ({getters}, payload) {
    let priceHistory = await PriceHistory.get(getters.activeOrganization, payload.productId)
    priceHistory.addPriceHistoryOfferItem(payload.data)
    await priceHistory.update()
  },
  async getProductPriceHistory ({commit, getters}, payload) {
    const {productId} = payload
    if (productId) {
      let now = new Date()
      let index = getters.priceHistories.findIndex(item => item.productId === productId)
      if (index >= 0 && 
        getters.priceHistories[index].lastUpdatedTime > getters.cronjobTimes.productPriceLastScanDate
      ) return 
      let priceHistory = await PriceHistory.get(getters.activeOrganization, productId)
      let newItem = {
        inbound: (priceHistory || {}).inbound || [], 
        lastUpdatedTime: now,
        productId
      }
      let newPriceHistories = [...getters.priceHistories]
      if (index >= 0) {
        newPriceHistories[index] = newItem
      } else newPriceHistories.push(newItem)
      commit('setPriceHistories', newPriceHistories)
    }
  },
  async addUserToTenant ({commit, getters, dispatch}, payload) {
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
    const {warehouses = [], workfor, organizations = []} = userDoc.data()
    if (warehouses.length || (workfor && workfor.length) || organizations.length) {
      throw Error('Cannot add staff(member) from other organization.')
    }

    return dbAccessor.runInBatch(batch => {
      batch.update(dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization]), {
        users: dbAccessor.fieldValue().arrayUnion({
          ...payload, 
          key: docs.docs[0].id, 
          name: docs.docs[0].data().name
        })
      })
      batch.update(dbAccessor.buildStoreQuery(['users', docs.docs[0].id]), {
        organizations: [getters.activeOrganization]
      })
    })
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: payload.roles
        })
      })
  },
  async removeUserFromTenant  ({commit, getters, dispatch}, payload) {
    // is there security risk?
    const tenantRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
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
      const tenantDoc = await transaction.get(tenantRef)

      transaction.update(tenantRef, {
        users: tenantDoc.data().users.filter(user => user.email !== payload.email)
      })
      transaction.update(userRef, {
        organizations: dbAccessor.deleteField()
      })
    })
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: ['user']
        })
      })
  },
  async editUserForTenant  ({commit, getters, dispatch}, payload) {
    // is there security risk?
    const tenantRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization])
    return dbAccessor.runInTransactionStore(async (transaction) => {
      const tenantDoc = await transaction.get(tenantRef)
      let {users} = tenantDoc.data()
      users.find(user => user.email === payload.email).roles = payload.roles
      transaction.update(tenantRef, {
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
  archiveProduct ({commit, getters}, product) {
    let offers = getters.offers.filter(offer => offer.productId === product.id)
    let proposes = getters.proposes.filter(propose => propose.productId === product.id)
    let archiveCollectionRef = dbAccessor.buildStoreQuery(['offers', 'offers', 'archives'])
    let productRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'inventory', product.id])
    let archivedProductRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'archivedInventory', product.id])

    let archiveProduct = {
      ...product,
      keywords: [
        ...splitProductName(product.name),
        product.id,
        product.upc,
        ...(product.asin || []).map(item => item.toLowerCase()),
        ...(product.sku || []).map(item => item.toLowerCase())
      ]
    }

    return dbAccessor.runInBatch(batch => {
      batch.delete(productRef)
      batch.set(archivedProductRef, dbAccessor.addNewDocTimestamp(archiveProduct))

      offers.forEach(offer => {
        batch.delete(dbAccessor.buildStoreQuery(['offers', 'offers', 'active', offer.key]))
        const product = getters.products.find(item => item.id === offer.productId) || {}
        batch.set(archiveCollectionRef.doc(), dbAccessor.addNewDocTimestamp({
          ...offer,
          productName: product.name
        }))
      })

      proposes.forEach(propose => {
        batch.delete(dbAccessor.buildStoreQuery(['offers', 'offers', 'proposes', propose.key]))
      })
    })
  },
  restoreProduct ({commit, getters}, product) {
    return dbAccessor.removeStore(
      'tenants', 
      getters.activeOrganization, 
      'archivedInventory', 
      product._key)
      .then(() => {
        let {keywords, ...rest} = product
        dbAccessor.updateStore(
          rest,     
          'tenants', 
          getters.activeOrganization, 
          'inventory', 
          product._key)
      })
      .then(() => {
        if (product.upc) {
          return dbAccessor.callFunction('processPackages', {
            tenantKey: getters.activeOrganization, 
            productId: product._key, 
            upc: product.upc
          })
        }
        return product._key
      })
      .then(() => {
        return Logger.changeLog({
          beforeValue: {}, 
          actionPayload: product,
          actionName: 'restoreProduct',
          categories: ['inventory'],
          keys: [product._key],
          keywords: product.upc ? [product.upc] : []
        })
      })
      .catch(error => {
        Logger.critical('addProduct', {error: error.message, ...product})
      })
  },
  getArchivedProducts ({commit, getters}, payload) {
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

    payload.predicates && payload.predicates.predicateText && 
      (predicates.push({
        field: `keywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      }))

    return dbAccessor.queryWithPagination(predicates, ['tenants', getters.activeOrganization, 'archivedInventory'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  uploadOrders ({commit, getters}, payload) {
    const {files} = payload
    const message = {
      uploadedFiles: files, 
      tenantKey: getters.activeOrganization,
      type: 'upload'
    }
    return dbAccessor.callFunction('processOrders', message)
  },
  getTenantOrders ({commit, getters}) {
    let successFunc = (docs) => {
      let orders = docs.docs.map(doc => {
        let order = doc.data()
        return OrderFactory.makeOrder(convertTimestampToDateInObj({...order, _key: doc.id}), getters.activeOrganization)
      })
      commit('setOrders', orders)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    let predicates = [{
      field: `status`,
      compare: 'in',
      value: ['open', 'partial']
    }]
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['tenants', getters.activeOrganization, 'orders'], 'createTime', false)
    commit('addTosubscribed', {orders: unsubscribe})
  },
  getSystemBalance ({ commit, getters }) {
    let successFunc = (doc) => {
      if (doc.exists) {
        commit('setSystemBalance', doc.data())
      }
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['systemBalance', getters.activeOrganization || getters.activeWarehouse])
    commit('addTosubscribed', { systemBalance: unsubscribe })
  },
  getWarehouseUploadHistory ({commit, getters}) {
    let successFunc = (doc) => {
      if (doc.exists) {
        const {trackings} = doc.data()
        commit('setUploadedTrackings', new Set(trackings))
      }
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'uploadHistory', 'uploadedTrackings'])
    commit('addTosubscribed', {uploadedTrackings: unsubscribe})
  },
  getTenantUploadHistory ({commit, getters}) {
    let successFunc = (docs) => {
      let uploadHistory = {} 
      docs.docs.forEach(doc => {
        uploadHistory[doc.id] = convertTimestampToDateInObj(doc.data())
      })
      commit('setUploadHistory', uploadHistory)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization, 'uploadHistory'])
    commit('addTosubscribed', {uploadHistory: unsubscribe})
  },
  cancelErrorMsg ({commit, getters}, payload) {
    return dbAccessor.runInTransactionStore(async transaction => {
      let doc = await transaction.get(dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'uploadHistory', 'errorMessages']))
      let {errorMsg} = doc.data()
      delete errorMsg[payload.key]
      transaction.update(doc.ref, {errorMsg})
    })
  },
  getHistoryOrdersPagination ({commit, getters}, payload) {
    let {startDate, endDate, limit, startAfter} = payload
    let predicates = [{
      field: 'status',
      compare: 'in',
      value: ['closed', 'partial', 'archived']
    }]

    if (startDate) {
      predicates.push({
        field: `processTime`,
        compare: '>=',
        value: startDate
      })
    }

    if (endDate) {
      predicates.push({
        field: `processTime`,
        compare: '<=',
        value: endDate
      })
    }

    if (payload.predicates && (payload.predicates.predicateText || payload.predicates.predicateSelect)) {
      predicates.push({
        field: `keywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText || payload.predicates.predicateSelect
      })
    }
  
    if (payload.predicates && payload.predicates.actionPredicates && payload.predicates.actionPredicates.length) {
      let {actionPredicates} = payload.predicates
      if (actionPredicates.length > 1 || actionPredicates[0].value) predicates.push(...actionPredicates)
    }
    
    return dbAccessor.queryWithPagination(predicates, ['tenants', getters.activeOrganization, 'orders'], 'processTime', true, startAfter, limit)
  },
  async deleteOrders ({commit, getters}, payload) {
    let {orders} = payload
    const historyDoc = await dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'uploadHistory', 'historyOrderIds']).get()
    const {historyOrderIds} = historyDoc.data()

    await Promise.all(orders.map(async ({_key}) => {
      const labelDocs = await dbAccessor.queryWithPredicatesStore([{
        field: `orderKey`,
        compare: '==',
        value: _key
      }, {
        field: `clientKey`,
        compare: '==',
        value: getters.activeOrganization
      }], 'labels')

      await dbAccessor.runInBatch(batch => {
        batch.delete(dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'orders', _key]))
        if (labelDocs.size) {
          labelDocs.docs.forEach(doc => {
            batch.update(doc.ref, {orderKey: ''})
          })
        }
      })
    }))

    await historyDoc.ref.update({
      historyOrderIds: historyOrderIds.filter(item => !orders.some(order => item.key.split('-').slice(1).join('-') === order.orderId))
    })
  },
  archiveOrder ({commit, getters}, payload) {
    return dbAccessor.updateFieldsStore({status: 'archived'}, 'tenants', getters.activeOrganization, 'orders', payload._key)
  },
  addNewSenderName ({commit, getters}, payload) {
    let updates = {
      senderNames: dbAccessor.fieldArrayUnion([payload])
    }
    return dbAccessor.updateFieldsStore(updates, 'users', getters.userExtra.uid)
  },
  deleteSenderName ({commit, getters}, payload) {
    let updates = {
      senderNames: dbAccessor.fieldArrayRemove([payload])
    }
    return dbAccessor.updateFieldsStore(updates, 'users', getters.userExtra.uid)
  },
  getRates ({commit, getters}, payload) {
    return dbAccessor.callFunction('processShippingLabel', {
      label: payload,
      clientKey: getters.activeOrganization || getters.activeWarehouse,
      type: 'getRates'
    }).then(rtn => {
      if (rtn.data.channel) {
        rtn.data.serviceType = rtn.data.serviceType + ' - ' + rtn.data.channel
      }
      if (Array.isArray(rtn.data.moreRates)) {
        rtn.data.moreRates = rtn.data.moreRates.map(rate => {
          if (rate.channel) {
            rate.serviceType = rate.serviceType + ' - ' + rate.channel
          }
          return rate
        })
      }
      return rtn
    })
  },
  getLabelPagination ({commit, getters}, payload) {
    let {startDate, endDate, limit, startAfter} = payload
    let predicates = getters.user.isAdmin ? [] : [{
      field: `clientKey`,
      compare: '==',
      value: getters.activeOrganization || getters.activeWarehouse
    }]

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

    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: `keywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      })
    }

    if (payload.predicates && payload.predicates.predicateSelect) {
      if (getters.activeOrganization || getters.activeWarehouse) {
        predicates.push({ 
          field: `status`, 
          compare: '==', 
          value: payload.predicates.predicateSelect 
        })
      } else {
        // for admin
        predicates.push({
          field: `clientKey`,
          compare: '==',
          value: payload.predicates.predicateSelect
        })
      }
    }
    return dbAccessor.queryWithPagination(predicates, ['labels'], 'createTime', true, startAfter, limit)
  },
  createLabels ({commit, getters}, payload) {
    if ((getters.systemBalance.balance || 0) <= (getters.systemBalance.lowestBalance || 0)) throw Error('Can not create label, balance is too low.')
    return dbAccessor.callFunction('processShippingLabel', {
      labels: payload,
      type: 'create',
      clientKey: getters.activeOrganization || getters.activeWarehouse,
      clientName: getters.activeWarehouse ? getters.warehouseLimitedInfo.warehouseName : getters.tenantLimitedInfo.name,
      isBeta: getters.isLabelBetaUser
    })
      .then(rtn => rtn.data)
  },
  createInternationalLabel ({commit, getters}, payload) {
    if ((getters.systemBalance.balance || 0) <= (getters.systemBalance.lowestBalance || 0)) throw Error('Can not create label, balance is too low.')
    return dbAccessor.callFunction('processShippingLabel', {
      label: payload,
      type: 'createInternational',
      clientKey: getters.activeOrganization || getters.activeWarehouse,
      clientName: getters.activeWarehouse ? getters.warehouseLimitedInfo.warehouseName : getters.tenantLimitedInfo.name,
      isBeta: getters.isLabelBetaUser,
      isInternational: true
    })
      .then(rtn => rtn.data)
  },
  async getAddressFromItn ({commit, getters}, {itn}) {
    let predicates = [{
      field: `itn`,
      compare: '==',
      value: itn
    }]
    const docs = await dbAccessor.queryWithPredicates(predicates, ['eeiRecords'])
    return docs.docs[0] ? docs.docs[0].data() : {}
  },
  processEei ({commit, getters}, payload) {
    if (payload.type === 'create' && (getters.systemBalance.balance || 0) <= (getters.systemBalance.lowestBalance || 0)) throw Error('Can not create EEI, balance is too low.')
    return dbAccessor.callFunction('processEei', {
      ...payload,
      clientKey: getters.activeOrganization || getters.activeWarehouse,
      clientName: getters.activeWarehouse ? getters.warehouseLimitedInfo.warehouseName : getters.tenantLimitedInfo.name
    })
      .then(rtn => rtn.data)
  },
  getEeiStatus ({commit, getters}, payload) {
    return dbAccessor.callFunction('processEei', {
      ...payload,
      type: 'getStatus'
    })
      .then(rtn => rtn.data)
  },
  cancelEei ({commit, getters}, payload) {
    return dbAccessor.callFunction('processEei', {
      ...payload,
      type: 'cancel',
      clientKey: getters.activeOrganization || getters.activeWarehouse,
      clientName: getters.activeWarehouse ? getters.warehouseLimitedInfo.warehouseName : getters.tenantLimitedInfo.name
    })
      .then(rtn => rtn.data)
  },
  async getCommodities ({commit, getters}, {keyword}) {
    let predicates = [
      {
        field: `clientKey`,
        compare: '==',
        value: getters.activeOrganization || getters.activeWarehouse
      },
      {
        field: `keywords`,
        compare: 'array-contains',
        value: keyword.toLowerCase()
      }
    ]

    let path = getters.activeOrganization ? 
      ['tenants', getters.activeOrganization, 'commodities'] : 
      ['warehouses', getters.activeWarehouse, 'commodities']

    const docs = await dbAccessor.queryWithPredicates(predicates, path)
    return docs.docs.map(doc => {
      return {
        ...doc.data(),
        key: doc.id
      }
    })
  },
  async addCommodity ({getters}, {isUpdate, ...payload}) {
    let path = getters.activeOrganization ? 
      ['tenants', getters.activeOrganization, 'commodities'] : 
      ['warehouses', getters.activeWarehouse, 'commodities']
    
    payload.keywords = splitProductName(payload.profileName)
    payload.clientKey = getters.activeOrganization || getters.activeWarehouse
    return isUpdate ? dbAccessor.updateStore(payload, ...path, payload.key) :
      dbAccessor.insertStore(payload, ...path)
  },
  async getRecentItns ({getters}) {
    let predicates = [
      {
        field: `clientKey`,
        compare: '==',
        value: getters.activeOrganization || getters.activeWarehouse
      },
      {
        field: `status`,
        compare: 'in',
        value: ['pending', 'ready']
      }
    ]
    const docs = await dbAccessor.queryWithPagination(predicates, ['eeiRecords'], 'createTime', true, null, 3)
    return docs.docs.map(doc => doc.data())
  },
  async cancelLabel ({commit, getters, dispatch}, payload) {
    await dbAccessor.callFunction('processShippingLabel', {
      label: {
        ...payload,
        createTime: payload.createTime.toString()
      },
      type: 'cancel',
      clientKey: getters.activeOrganization || getters.activeWarehouse
    })
    let targetShipment = getters.shipments.find(item => item._key === payload.shipmentId)
    if (targetShipment) await dispatch('cancelShipment', targetShipment)
  },
  editLabel ({commit, getters}, payload) {
    return dbAccessor.callFunction('processShippingLabel', {
      label: payload,
      type: 'editNote'
    })
  },
  getLabelStatus ({commit, getters}, payload) {
    return dbAccessor.callFunction('processShippingLabel', {
      orderId: payload.orderId,
      type: 'status'
    })
  },
  getTenantAddress ({commit, getters}) {
    let successFunc = (doc) => {
      let {addresses = []} = doc.data() || {}
      commit('setTenantAddresses', addresses)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization, 'config', 'addresses'])
    commit('addTosubscribed', {addresses: unsubscribe})
  },
  getFavorites ({commit, getters}) {
    let successFunc = (doc) => {
      commit('setFavorites', doc.data() || {})
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization, 'config', 'favorites'])
    commit('addTosubscribed', {favorites: unsubscribe})
  },
  updateFavorites ({commit, getters}, payload) {
    if (JSON.stringify(getters.favorites) === '{}') {
      return dbAccessor.updateStore(payload, 'tenants', getters.activeOrganization, 'config', 'favorites')
    }
    return dbAccessor.updateFieldsStore(payload, 'tenants', getters.activeOrganization, 'config', 'favorites')
  },
  getWarehouseAddress ({commit, getters}) {
    let successFunc = (doc) => {
      let {addresses = []} = doc.data() || {}
      commit('setTenantAddresses', addresses)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'config', 'addresses'])
    commit('addTosubscribed', {addresses: unsubscribe})
  },
  labelCreateAddress ({commit, getters}, payload) {
    if (!payload.addresses || !payload.addresses.length) throw Error('Address not found.')
    const addressRef = getters.activeOrganization ? dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'config', 'addresses']) :
      dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'config', 'addresses'])

    return dbAccessor.runInTransactionStore(async transaction => {
      const addressDoc = await transaction.get(addressRef)
      if (!addressDoc.exists) {
        transaction.set(addressDoc.ref, dbAccessor.addNewDocTimestamp({addresses: payload.addresses}))
      } else {
        let {addresses = []} = addressDoc.data()
        payload.addresses.forEach(address => {
          const idx = addresses.findIndex(item => item.siteName === address.siteName)
          if (idx !== -1) {
            addresses[idx] = address
          } else {
            addresses.push(address)
          }
        })
  
        transaction.update(addressDoc.ref, dbAccessor.addUpdateDocTimestamp({addresses}))
      }
    })
  },
  labelEditAddress ({commit, getters}, payload) {
    const addressRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'config', 'addresses'])
    return dbAccessor.runInTransactionStore(async transaction => {
      let doc = await transaction.get(addressRef)
      let {addresses = []} = doc.data()
      let targetIdx = addresses.findIndex(item => item.siteName === payload.siteName)
      addresses[targetIdx] = payload
      transaction.update(doc.ref, dbAccessor.addUpdateDocTimestamp({addresses}))
    })
  },
  labelDeleteAddress ({commit, getters}, payload) {
    let addressRef
    if (getters.activeOrganization) {
      addressRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'config', 'addresses'])
    } else {
      addressRef = dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'config', 'addresses'])
    }
    return dbAccessor.runInTransactionStore(async transaction => {
      let doc = await transaction.get(addressRef)
      let {addresses = []} = doc.data()
      Logger.log('labelDeleteAddress', { addresses, payload })
      transaction.update(doc.ref, {addresses: addresses.filter(address => address.siteName !== payload.siteName)})
    })
  },
  getTenantPackaging ({commit, getters}) {
    let successFunc = (doc) => {
      let {packagings = []} = doc.data() || {}
      commit('setTenantPackagings', packagings.map(item => { return {...item, pkgValue: item.name} }))
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization, 'config', 'packagings'])
    commit('addTosubscribed', {packagings: unsubscribe})
  },
  getWarehousePackaging ({commit, getters}) {
    let successFunc = (doc) => {
      let {packagings = []} = doc.data() || {}
      commit('setTenantPackagings', packagings.map(item => { return {...item, pkgValue: item.name} }))
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['warehouses', getters.activeWarehouse, 'config', 'packagings'])
    commit('addTosubscribed', {packagings: unsubscribe})
  },
  editPackaging ({commit, getters}, payload) {
    const {packagingInEdit} = payload
    const packagingRef = getters.activeOrganization ? dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'config', 'packagings']) :
      dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'config', 'packagings'])
    return dbAccessor.runInTransactionStore(async transaction => {
      const packagingDoc = await transaction.get(packagingRef)
      if (!packagingDoc.exists) {
        transaction.set(packagingDoc.ref, dbAccessor.addNewDocTimestamp({packagings: [packagingInEdit]}))
      } else {
        let {packagings = []} = packagingDoc.data()

        const idx = packagings.findIndex(item => item.name === packagingInEdit.name)
        if (idx !== -1) {
          packagings[idx] = packagingInEdit
        } else {
          packagings.push(packagingInEdit)
        }
  
        transaction.update(packagingDoc.ref, dbAccessor.addUpdateDocTimestamp({packagings}))
      }
    })
  },
  deletePackaging ({commit, getters}, payload) {
    let packagingRef
    if (getters.activeOrganization) {
      packagingRef = dbAccessor.buildStoreQuery(['tenants', getters.activeOrganization, 'config', 'packagings'])
    } else {
      packagingRef = dbAccessor.buildStoreQuery(['warehouses', getters.activeWarehouse, 'config', 'packagings'])
    }
    return dbAccessor.runInTransactionStore(async transaction => {
      let doc = await transaction.get(packagingRef)
      let {packagings = []} = doc.data()
      transaction.update(doc.ref, {packagings: packagings.filter(packaging => packaging.name !== payload.name)})
    })
  },
  getTemplates ({commit, getters}) {
    let successFunc = (docs) => {
      let templates = docs.docs.map(doc => {
        return {
          ...doc.data(),
          key: doc.id
        }
      })
      commit('setTemplates', templates)
    }

    let errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    let path = getters.activeOrganization ? [
      'tenants', 
      getters.activeOrganization, 
      'templates'
    ] : [
      'warehouses', 
      getters.activeWarehouse, 
      'templates'
    ]

    let unsubscribe = dbAccessor.queryRT(successFunc, 
      errorFunc, 
      [], 
      path)

    commit('addTosubscribed', {templates: unsubscribe})
  },
  updateTemplate ({commit, getters}, payload) {
    const path = getters.activeOrganization ? [
      'tenants', 
      getters.activeOrganization, 
      'templates'
    ] : [
      'warehouses', 
      getters.activeWarehouse, 
      'templates'
    ]
    return payload.key ? 
      dbAccessor.updateStore(payload, ...path, payload.key) : 
      dbAccessor.insertStore(payload, ...path)
  },
  deleteTemplate ({commit, getters}, payload) {
    const path = getters.activeOrganization ? [
      'tenants', 
      getters.activeOrganization, 
      'templates',
      payload.key
    ] : [
      'warehouses', 
      getters.activeWarehouse, 
      'templates',
      payload.key
    ]
    
    return dbAccessor.removeStore(...path)
  },
  exportOrderShippingsConfirmFiles ({commit, getters}, payload) {
    const orders = payload.map(order => {
      let orderClone = cloneDeep(order)
      const {shipments} = orderClone
      if (Array.isArray(shipments)) {
        shipments.forEach(shipment => {
          // look up cache
          if (shipment.status === 'pending') {
            const {trackingNum, labels = []} = getters.shipments.find(({_key}) => shipment.key === _key) || {}
            shipment.trackingNumber = labels.length ? labels[0].trackingNum : trackingNum
            shipment.method = (labels[0] || {}).serviceType || ''
            shipment.carrier = (labels[0] || {}).carrier || ''
          }
        })
      }
      return OrderFactory.makeOrder({...orderClone, shipments}, getters.activeOrganization)
    })
    return OrderFactory.exportOrdersToFiles(orders)
  },
  async downloadSelectedOrderLabels ({commit, getters, dispatch}, {orders, isMergePDF}) {
    let urls = []
    orders.map(order => {
      const {shipments} = order
      if (Array.isArray(shipments)) {
        shipments.forEach(shipment => {
          if (shipment.status === 'pending') {
            const {labels = []} = getters.shipments.find(({_key}) => shipment.key === _key) || {}
            labels.forEach(label => {
              if (label.url) {
                urls.push({
                  url: label.url,
                  name: label.trackingNum
                })
              }
            })
          } else {
            let {trackingNumber, labelUrl} = shipment
            if (labelUrl) {
              urls.push({
                url: labelUrl,
                name: trackingNumber
              })
            }
          }
        })
      }
    })
    if (urls.length > 100) {
      const errMsg = 'Download label quantity is limited to 100.'
      dispatch('showToast', {info: errMsg, level: 'error'})
      console.error(Error(errMsg))
      throw Error(errMsg)
    }
    const res = await dbAccessor.callFunction('downloadLabelZip', {
      files: urls,
      isMergePDF
    })
    const {zipFile} = res.data
    await dispatch('downloadFile', {fullPath: zipFile, name: isMergePDF ? 'labels.pdf' : 'labels.zip'})
    await dbAccessor.removeFile(zipFile)
  },
  async downloadSelectedLabels ({commit, getters, dispatch}, {labels, isMergePDF}) {
    let urls = labels.map(label => {
      return {
        url: label.url,
        name: label.trackingNumber
      }
    })

    if (urls.length > 100) {
      const errMsg = 'Download label quantity is limited to 100.'
      dispatch('showToast', {info: errMsg, level: 'error'})
      console.error(Error(errMsg))
      throw Error(errMsg)
    }
    
    const res = await dbAccessor.callFunction('downloadLabelZip', {
      files: urls,
      isMergePDF
    })
    const {zipFile} = res.data
    await dispatch('downloadFile', {fullPath: zipFile, name: isMergePDF ? 'labels.pdf' : 'labels.zip'})
    await dbAccessor.removeFile(zipFile)
  },
  async getShipFrom ({commit, getters, dispatch}, distribution) {
    let {warehouseKey, warehouseSite, siteName, uid, userName} = distribution
    if (!warehouseKey && warehouseSite === siteName) {
      // this is user storage
      const name = siteName.split(' - ')[2]
      await dispatch('getUserSites', uid)
      const targetSite = getters.sites.find(item => item.siteName === name)
      if (targetSite) {
        const {address1, address2, city, state, zip: zipCode} = targetSite
        return {address1, address2, city, state: getters.statesToAbbrev[state], zipCode}
      }
      return {}
    }
    
    if (userName === 'self') {
      // this is tenant self storage
      const {address1, address2, city, state, zipCode} = getters.siteKeyMap.get(siteName)
      return {address1, address2, city, state: getters.statesToAbbrev[state], zipCode}
    } 
    // this is warehouse storage
    const {address1, address2, city, state, zipCode, phone} = getters.siteKeyMap.get(warehouseSite)
    return {address1, address2, city, state: getters.statesToAbbrev[state], zipCode, phone}
  },
  async addOrderLabels ({commit, getters}, payload) {
    if ((getters.systemBalance.balance || 0) <= (getters.systemBalance.lowestBalance || 0)) throw Error('Can not create label, balance is too low.')
    const res = await dbAccessor.callFunction('processOrders', {
      ...payload,
      type: 'addOrderLabel',
      clientKey: getters.activeOrganization,
      clientName: getters.tenantLimitedInfo.name,
      isBeta: getters.isLabelBetaUser
    })
    return res.data
  },
  addSkuRequest ({commit, getters}, payload) {
    return dbAccessor.insertStore({
      ...payload,
      tenantKey: getters.activeOrganization
    }, 'skuRequests')
  },
  updateSkuRequest ({commit, getters}, payload) {
    const {key, ...rest} = payload
    return dbAccessor.updateStore({
      ...rest,
      tenantKey: getters.activeOrganization
    }, 'skuRequests', key)
  },
  removeSkuRequest ({commit, getters}, payload) {
    return dbAccessor.removeStore('skuRequests', payload.key)
  },
  getSkuRequests ({commit, getters, dispatch}) {
    const successFunc = (docs) => {
      if (docs.size > 0 && getters.activeWarehouse) {
        dispatch('addNotification', {
          key: 'newSkuRequests',
          displayName: 'sku requests',
          pathName: 'sku requests',
          path: '/package?tab=skuRequests'
        })
      }
      commit('setSkuRequests', docs.docs.map(doc => convertTimestampToDateInObj({...doc.data(), key: doc.id})))
    }

    const errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    const predicates = getters.activeOrganization ? [{
      field: `tenantKey`,
      compare: '==',
      value: getters.activeOrganization
    }] : (getters.activeWarehouse && [{
      field: `warehouseKey`,
      compare: '==',
      value: getters.activeWarehouse
    }]) 

    const unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['skuRequests'])
    commit('addTosubscribed', {skuRequests: unsubscribe})
  },
  createShipmentDraft ({commit, getters}, payload) {
    const {files, ...rest} = payload
    const fileInfoArr = files.map(item => {
      const {metadata, file} = item
      const {name, prettySize} = file
      return {
        metadata, 
        task: {
          progress: 100,
          snapshot: {
            state: 'success'
          }
        },
        file: {
          name, 
          prettySize
        }
      }
    })
    return dbAccessor.insertStore({...rest, files: fileInfoArr}, 'tenants', getters.activeOrganization, 'shipmentDrafts')
  },
  getShipmentDrafts ({commit, getters, dispatch}) {
    const successFunc = (docs) => {
      const drafts = docs.docs.map(doc => convertTimestampToDateInObj({...doc.data(), _key: doc.id}))
      commit('setShipmentDrafts', drafts)
    }

    const errorFunc = (error) => {
      console.error(error)
      commit('setLoading', false)
      throw error
    }

    const unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['tenants', getters.activeOrganization, 'shipmentDrafts'], 'createTime', true)
    commit('addTosubscribed', {shipmentDrafts: unsubscribe})
  },
  cancelShipmentDraft ({commit, getters}, {_key}) {
    return dbAccessor.removeStore('tenants', getters.activeOrganization, 'shipmentDrafts', _key)
  },
  updateShipmentDraft ({commit, getters}, {key, data}) {
    const {files, ...rest} = data
    const fileInfoArr = files.map(item => {
      const {metadata, file} = item
      const {name, prettySize} = file
      return {
        metadata, 
        task: {
          progress: 100,
          snapshot: {
            state: 'success'
          }
        },
        file: {
          name, 
          prettySize
        }
      }
    })
    return dbAccessor.updateFieldsStore({...rest, files: fileInfoArr}, 'tenants', getters.activeOrganization, 'shipmentDrafts', key)
  },
  async getTenantDiscount ({commit, getters}, {warehouseKey}) {
    const orgDoc = await dbAccessor.queryStore('warehouses', warehouseKey, 'organizations', getters.activeOrganization)
    const {discountKey} = orgDoc.data() || {}
    const warehouseLimitedInfoDoc = await dbAccessor.queryStore('warehouseLimitedInfo', warehouseKey)
    const {tierDiscounts = {}} = warehouseLimitedInfoDoc.data() || {}
    return tierDiscounts[discountKey]
  },
  async getAmazonSites ({commit, getters}, payload) {
    const doc = await dbAccessor.queryStore('sysAdmin', 'amazonSites')
    if (!doc.exists) return 'done'
    const {sites = []} = doc.data()
    commit('setAmazonSites', sites.map(({siteName, ...rest}) => {
      return {...rest, siteName: `Amazon - ${siteName}`, isAmazon: true}
    }))
  },
  getEeiPagination ({commit, getters}, payload) {
    let predicates = getters.user.isAdmin ? [] : [{
      field: 'clientKey',
      compare: '==',
      value: getters.activeOrganization || getters.activeWarehouse
    }]

    if (payload.predicates.predicateSelect) {
      predicates.push({
        field: `clientKey`,
        compare: '==',
        value: payload.predicates.predicateSelect
      })
    }
        
    if (payload.predicates && payload.predicates.predicateText) {
      predicates.push({
        field: `keywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText.toLowerCase()
      })
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
    return dbAccessor.queryWithPagination(predicates, ['eeiRecords'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  async getAESHTS ({commit, getters}) {
    const blob = await dbAccessor.getFileBlob(process.env.AESHTSUri)
    const zip = await JSZip.loadAsync(blob)
    const file = await zip.file('AESHTS_2021-07-26.xlsx - Sheet1.csv').async('string')
    let wb = xlsx.read(file, {type: 'binary'})
    let ws = wb.Sheets[wb.SheetNames[0]]
    let entries = xlsx.utils.sheet_to_json(ws, { raw: false })
    let map = {}
    entries.forEach((entry) => {
      const {hts_code: code, hts_desc: desc, uom, uom1} = entry
      map[code] = {
        desc, 
        uom, 
        uom1
      }
    })
    commit('setScheduleBMap', map)
  }
}

export const getters = {
  tenant (state) {
    return state.tenant
  },
  products (state) {
    return state.products.map(item => {
      return {...item, asinForSearch: item.asin ? item.asin.join('') : ''}
    })
  },
  offers (state) {
    return state.offers
  },
  proposes (state) {
    return state.proposes
  },
  expiredOffers (state) {
    return state.expiredOffers
  },
  archives (state) {
    return state.archives
  },
  users (state) {
    return state.users
      .map(user => ({
        ...user,
        status: getApprovalTypeString(user.approvalType),
        balance: (state.balance[user.uid] && state.balance[user.uid].total) || 0 
      }))
  },  
  userRequest (state) {
    return state.userRequest
  },
  groups (state) {
    return state.groups
  },
  inbound (state) {
    return state.inbound
  },
  allDistribution (state, getters) {
    return getters.products.reduce((acc, product) => {
      const {distribution, ...productInfo} = product
      if (distribution) {
        const productDist = Object.keys(distribution).map(fbmKey => {
          return {
            ...productInfo, 
            ...distribution[fbmKey],
            fbmKey
          }
        })
        return [...acc, ...productDist]
      } 
      return acc
    }, [])
  },
  shipments (state) {
    return state.shipments
  },
  shipmentsAndDrafts ({shipments, shipmentDrafts}) {
    return [
      ...shipmentDrafts.map(item => {
        return {...item, isDraft: true}
      }),
      ...shipments
    ]
  },
  shipmentToTrackingMap (state) {
    return new Map(state.shipments.map(item => [item._key, item.trackingNum]))
  },
  archivedShipments (state) {
    return state.archivedShipments
  },
  subscribed (state) {
    return state.subscribed
  },
  balance (state) {
    return state.balance
  },
  pendingTransactions (state) {
    return state.pendingTransactions
  },  
  tenantLimitedInfo (state) {
    return state.tenantLimitedInfo
  },
  warehouses (state) {
    return state.warehouses
  },
  warehouseKeyToNameMap (state) {
    let map = {}
    state.warehouses.forEach(warehouse => {
      let {warehouseKey, warehouseName} = warehouse
      map[warehouseKey] = warehouseName
    })
    return map
  },
  allPreferredWarehouses (state) {
    return state.warehouses.filter(warehouse => warehouse.orgId && warehouse.orgId.length > 0)
  },
  reportLost (state) {
    return state.reportLost
  },
  warehousesPromotionsMap (state) {
    return state.warehousesPromotionsMap
  },
  warehouseLimitedInfoForTenant (state) {
    return state.warehouseLimitedInfoForTenant
  },
  warehouses2BillingsMap (state) {
    return new Map(state.warehouseBillings.map(item => {
      let {key, ...rest} = item
      return [key.split('_')[0], rest]
    }))
  },
  warehousesWithBalanceAndThreshold (state, getters) {
    return getters.allPreferredWarehouses.map(warehouse => {
      let rtn = {...warehouse}
      let billing = getters.warehouses2BillingsMap.get(warehouse.warehouseKey)
      let threshold = getters.warehouse2ThresholdsMap.get(warehouse.warehouseKey)
      rtn.balance = billing ? billing.balance : 0
      if (threshold) {
        rtn = {...rtn, ...threshold}
      }
      return rtn
    })
  },
  promotionsUnreadList (state, getters) {
    return Array.from(state.warehousesPromotionsMap.values()).map(warehousePromotions => 
      warehousePromotions.map(promotion => 
        !(promotion.readList && promotion.readList.includes(getters.activeOrganization)) && promotion.key 
      ).filter(key => key)
    ).reduce((preUnreadList, curUnreadList) => preUnreadList.concat(curUnreadList), [])
  },
  warehouse2ThresholdsMap (state) {
    return new Map(state.warehouseLimitedInfoForTenant.map(item => {
      let {key, criticalLowBalanceThreshold = 0, lowBalanceWarningThreshold = 0} = item
      return [key, {criticalLowBalanceThreshold, lowBalanceWarningThreshold}]
    }))
  },
  memberType (state) {
    return state.tenant.memberType || 0
  },
  productsWithUpcChangeableFlag (state) {
    const productsOnShipping = state.shipments.reduce((acc, shipment) => {
      let {products} = shipment
      return [...acc, ...products.map(product => product.id)]
    }, [])
    let shippingProductIds = new Set(productsOnShipping)
    return state.products.map(product => {
      const {quantity, distribution, id, upc, price} = product
      const isDistributionEmpty = !distribution || !Object.values(distribution).some(value => value.quantity > 0)
      const isUpcChangeable = !upc || (!quantity && !shippingProductIds.has(id) && isDistributionEmpty)
      let newProduct = {...product, isUpcChangeable}
      if (price && quantity) {
        newProduct.value = price * quantity
      } else {
        delete newProduct.value
      }
      return newProduct
    })
  },
  tenantUpcToProductNameMap (state) {
    let map = {}
    state.products.forEach(product => {
      const {name, upc} = product
      map[upc] = name
    })
    return map
  },
  skuToProductIdMap (state) {
    let map = new Map()
    state.products.forEach(product => {
      let {sku, id} = product
      if (sku) {
        sku.forEach(item => {
          map.set(item, id)
        })
      }
    })
    return map
  },
  skuSet (state) {
    return new Set(state.products.reduce((acc, product) => {
      if (product.sku) {
        return [...acc, ...product.sku]
      }
      return acc
    }, []))
  },
  tenantAnnouncements (state) {
    return state.tenantAnnouncements
  },
  productTransfersPending (state) {
    return state.pendingProductTransfers
  },
  supports (state) {
    return state.supports
  },
  priceHistories (state) {
    return state.priceHistories
  },
  warehouseSites (state) {
    return state.warehouses.reduce((sites, warehouse) => 
      [
        ...sites, 
        ...(warehouse.sites || [])
          .map(site => {
            let newSite = {
              ...site, 
              warehouseName: warehouse.warehouseName,
              warehouseKey: warehouse.warehouseKey
            }
            if (warehouse.orgId) newSite.orgId = warehouse.orgId
            return newSite
          })
      ], []
    )
  },
  orders (state) {
    return state.orders
  },
  templates (state) {
    return state.templates
  },
  tenantSiteMap (state, getters) {
    return new Map(getters.warehouses
      .map(warehouse => {
        let {sites, warehouseName} = warehouse
        return sites.map(site => {
          return {...site, warehouseName}
        })
      })
      .flat()
      .map(item => {
        const {warehouseName, siteName, address1, address2 = '', city, state, zip: zipCode} = item
        return [siteName, {warehouseName, address1, address2, city, state, zipCode}]
      }))
  },
  siteKeyMap (state, getters) {
    return new Map(getters.warehouses
      .map(warehouse => {
        let {sites, warehouseName} = warehouse
        return sites.map(site => {
          return {...site, warehouseName}
        })
      })
      .flat()
      .map(item => {
        const {warehouseName, siteName, address1, address2 = '', city, state, zip: zipCode, key, phone} = item
        return [key || siteName, {warehouseName, siteName, address1, address2, city, state, zipCode, phone}]
      }))
  },
  enableAmazonSites (state, {tenantLimitedInfo, warehouseInfo}) {
    return !!(tenantLimitedInfo && tenantLimitedInfo.enableAmazonSites) || 
      !!(warehouseInfo && warehouseInfo.generalSettings && warehouseInfo.generalSettings.enableAmazonSites)
  },
  isMeasurementMetric (state, {tenantLimitedInfo, warehouseInfo}) {
    return !!(tenantLimitedInfo && tenantLimitedInfo.isMeasurementMetric) || 
      !!(warehouseInfo && warehouseInfo.generalSettings && warehouseInfo.generalSettings.isMeasurementMetric)
  },
  tenantAddresses (state, {enableAmazonSites}) {
    if (enableAmazonSites) {
      return [
        ...state.tenantAddresses,
        ...state.amazonSites
      ]
    }
    return state.tenantAddresses
  },
  tenantPackagings (state) {
    return state.tenantPackagings
  },
  tenantPackagingsWithDefault (state) {
    return [{
      pkgValue: 'Default packaging',
      name: 'Default(8"x8"x8")',
      length: 8,
      width: 8,
      height: 8,
      isPackagingDefault: true
    },
    {
      pkgValue: 'vite 20x14x4',
      name: 'vite(20"x14"x4")',
      length: 20,
      width: 14,
      height: 4,
      isPackagingDefault: true
    },
    {
      pkgValue: 'vite 20x18x16',
      name: 'vite(20"x18"x16")',
      length: 20,
      width: 18,
      height: 16,
      isPackagingDefault: true
    }, ...state.tenantPackagings]
  },
  packagingMap (state, getters) {
    return new Map(getters.tenantPackagingsWithDefault.map(item => [item.pkgValue, item]))
  },
  systemBalance (state) {
    return state.systemBalance
  },
  systemBalances (state) {
    return state.systemBalances
  },
  labelTemplateFlexibleVars (state) {
    return state.labelTemplateFlexibleVars
  },
  skuRequests (state) {
    return state.skuRequests
  },
  uploadedTrackings (state) {
    return state.uploadedTrackings
  },
  favorites (state) {
    return state.favorites
  },
  amazonSites (state) {
    return state.amazonSites
  },
  isLabelBetaUser (state, getters) {
    return state.tenantLimitedInfo.isLabelBetaUser || getters.warehouseLimitedInfo.isLabelBetaUser || false
  },
  viteSupports (state) {
    return state.viteSupports
  },
  scheduleBMap (state) {
    return state.scheduleBMap
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}
