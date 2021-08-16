import * as dbAccessor from '@/utils/dbAccessor'
import {getNullFields, deepEqual, Logger, addNumbers, splitProductName, convertTimestampToDateInObj} from '@/utils/tools'
import router from '@/router'
import { Announcement, Package } from '@/orm'
import { subDays } from 'date-fns'

/**
 * @typedef {import('@/utils/dbAccessor').Predicate} Predicate
 */

const initialState = {
  user: null,
  userExtra: null,
  userLoading: false,
  tenantWorkFor: [],
  tenantRequested: [],
  sites: [],
  tasks: [],
  historyTasks: [],
  warehouseName: null,
  balanceForUser: {
    total: 0,
    pending: 0,
    released: 0
  },
  paymentRequests: [],
  allTenantLimitedInfo: {},
  paymentMethods: [],
  warehousesForUser: [],
  paymentRequestFilterItems: [
    { name: 'All', method: 0 }, 
    { name: 'New Comments', method: 1 }, 
    { name: 'Starred', method: 2 }
  ],
  userInventory: [],
  announcementsMap: new Map(),
  adminAnnouncements: [],
  notifications: [],
  localSettings: {},
  popupStack: [],
  superUsers: []
}

const state = Object.assign({}, initialState)

export const mutations = {
  reset_state (state) {
    for (let prop in state) {
      state[prop] = initialState[prop]
    }
  },
  setUser (state, payload) {
    state.user = payload
  },
  setUserLoading (state, payload) {
    state.userLoading = payload
  },
  setSites (state, payload) {
    state.sites = payload
  },
  setWarehouseName (state, payload) {
    state.warehouseName = payload
  },
  setTenantWorkFor (state, payload) {
    state.tenantWorkFor = payload
  },
  setExtra (state, payload) {
    state.userExtra = payload
  },
  setTenantRequested (state, payload) {
    state.tenantRequested = payload
  },
  setTasks (state, payload) {
    state.tasks = payload
  },
  setHistoryTasks (state, payload) {
    state.historyTasks = payload
  },
  setSearchedPackages (state, payload) {
    state.searchedPackages = payload
  },
  setConfirmedPackages (state, payload) {
    state.confirmedPackages = payload
  },
  setBalanceForUser (state, payload) {
    state.balanceForUser = payload
  },
  setPaymentRequests (state, payload) {
    state.paymentRequests = payload
  },
  setPaymentMethods (state, payload) {
    state.paymentMethods = payload
  },  
  setAllTenantLimitedInfo (state, payload) {
    state.allTenantLimitedInfo = payload
  },
  setWarehousesForUser (state, payload) {
    state.warehousesForUser = payload
  },
  setUserInventory (state, payload) {
    state.userInventory = payload
  },
  setAnnouncementsMap (state, payload) {
    state.announcementsMap = payload
  },
  setAdminAnnouncements (state, payload) {
    state.adminAnnouncements = payload
  },
  setNotifications (state, payload) {
    state.notifications = payload
  },
  addNotification (state, payload) {
    state.notifications.push(payload)
  },
  removeNotification (state, payload) {
    state.notifications = state.notifications.filter(({key}) => key !== payload.key)
  },
  setlocalSettings (state, payload) {
    const { name, value } = payload
    state.localSettings[name] = value
    state.user && state.user.uid && window.localStorage.setItem(name + '_' + state.user.uid, JSON.stringify(value))
  },
  registerPopup  (state, payload) {
    state.popupStack.push(payload)
  },
  unRegisterPopup (state, payload) {
    state.popupStack = state.popupStack.filter(item => item !== payload)
  },
  setSuperUsers (state, payload) {
    state.superUsers = payload
  }
}

export const actions = {
  reset_state ({commit}) {
    commit('reset_state')
  },
  signUserUp ({commit, dispatch}, payload) {
    commit('setLoading', true)
    commit('clearError')
    payload.overrideKey = 'lkjwnlks23432lksdf$%^$'
    return dbAccessor.callFunction('signupUser', payload)
      .then(uid => {
        return dispatch('signUserIn', {email: payload.email, password: payload.password})
      })
      .catch(
        error => {
          commit('setLoading', false)
          commit('setError', error)
        }
      )
  },
  signUserIn ({commit}, payload) {
    commit('setLoading', true)
    commit('clearError')
    return dbAccessor.login(payload.email, payload.password)
      .then(
        user => {
          commit('setLoading', false)
          commit('clearError')
        }
      )
      .catch(
        error => {
          commit('setLoading', false)
          commit('setError', error)
        }
      )
  },
  checkEmailAvailable ({commit, getters}, payload) {
    let predicates = [{
      field: 'email',
      compare: '==',
      value: payload
    }]
    return dbAccessor.queryWithPredicates(predicates, ['users'])
      .then(doc => {
        if (doc.size > 0) {
          return false
        } 
        return true
      })
  },
  checkNameAvailable ({commit, getters}, payload) {
    let predicates = [{
      field: 'name',
      compare: '==',
      value: payload
    }]
    return dbAccessor.queryWithPredicates(predicates, ['users'])
      .then(doc => {
        if (doc.size > 0) {
          return false
        } 
        return true
      })
  },
  sendPasswordResetEmail ({commit, getters}, payload) {
    return dbAccessor.sendPasswordResetEmail(payload)
  },
  sendEmailVerification ({commit, getters}, payload) {
    return dbAccessor.sendEmailVerification(payload)
  },
  finishEmailSignup ({commit, getters, dispatch}, payload) {
    payload.email = dbAccessor.finishEmailSignup()
    if (payload.email) {
      return dispatch('signUserUp', payload)
    } else {
      let error = new Error('Invalid Email')
      commit('setError', error)
      return Promise.reject(error)
    }
  },
  autoSignIn ({commit, dispatch, getters}, payload) {
    let promises = []
    commit('setLoading', true)
    dispatch('loadLocalSettings')
    if (getters.activeOrganization) {
      promises.push(dispatch('getAllGroups'))
      promises.push(dispatch('getWarehousesForTenant', getters.activeOrganization)
        .then(() => Promise.all([
          dispatch('getWarehouseLimitedInfoForTenant'),
          dispatch('getWarehousesBillingsForTenant'),
          dispatch('getAbnormalPackages')
        ]))
      )
      promises.push(dispatch('getTenantLimitedInfo'))
    }
    if (!payload.userData.paymentMethods) {
      let newPayload = {
        paymentMethods: []
      }
      dbAccessor.updateFieldsStore(newPayload, 'users', payload.userData.uid)
    }
    dispatch('loadSystemInfo')
    promises.push(dispatch('loadTenantData'))
    promises.push(dispatch('loadUpc'))
    promises.push(dispatch('loadWarehouseSite'))
    promises.push(dispatch('loadWarehouseInfo'))
    promises.push(dispatch('loadWarehouseOrganizations'))
    promises.push(dispatch('loadWarehouseBillings'))
    promises.push(dispatch('getAllProducts'))
    promises.push(dispatch('getAllTenantLimitedInfo'))
    promises.push(dispatch('getTenantInformation'))
    promises.push(dispatch('loadWarehouseLimitedInfo'))
    
    dispatch('getShipments')

    // loading data
    if (!getters.activeWarehouse) {
      dispatch('getAllOffers')
      dispatch('getProposedOffers')
    }

    if (getters.activeOrganization) {
      dispatch('getReportLostTenant')
      dispatch('getPaymentRequestForTenant')
      dispatch('getMembers')
      dispatch('getBalancesForTenant')
      dispatch('getTenantAnnouncements')
      dispatch('loadPackageReportsTenant')
      dispatch('getPendingProductTransfer')
      dispatch('getActiveSupports')
      dispatch('getTenantOrders')
      dispatch('getTenantUploadHistory')
      dispatch('getTenantAddress')
      dispatch('getTenantPackaging')
      dispatch('getTemplates')
      dispatch('getSystemBalance')
      dispatch('getSkuRequests')
      dispatch('getFavorites')
      dispatch('getShipmentDrafts')
      dispatch('getAmazonSites')
    }
    if (!getters.activeOrganization && !getters.activeWarehouse) {
      dispatch('getReportLostUser')
      dispatch('getPaymentRequestForUser')
      dispatch('getPaymentMethod')
      dispatch('subscribeUserInventory')
      dispatch('getAllTasks')
    }

    if (getters.activeWarehouse) {
      dispatch('getWarehouseAnnouncements')
      dispatch('loadPackageReportsWarehouse')
      dispatch('getActiveSupports')
      dispatch('getAbnormalPackages')
      dispatch('getWarehouseAddress')
      dispatch('getWarehousePackaging')
      dispatch('getTemplates')
      dispatch('getSystemBalance')
      dispatch('getSkuRequests')
      dispatch('getWarehouseUploadHistory')
      dispatch('getInboundTrackingCache')
      dispatch('getAmazonSites')
      dispatch('getPickupRecordRT')
    }

    return Promise.all(promises)
      .then(() => {
        commit('setLoading', false)
        commit('setUserLoading', false)
        dispatch('getAllAnnouncements')
      })
      .catch(error => console.error(error))
  },
  async logout ({commit, dispatch, getters}) {
    await dispatch('flushEventLogs')
    commit('setUser', null)
    let subscribes = getters.subscribed
    // console.log('subscribes: ', Object.keys(subscribes))
    Object.keys(subscribes).forEach(key => { subscribes[key] && subscribes[key]() })
    await dbAccessor.logout()
    await dispatch('reset_state')
    router.push('/')
  },
  async loadUser ({commit, dispatch, getters}, payload) {
    let {uid, email} = payload
    commit('setUserLoading', true)

    let adminDoc = await dbAccessor.queryWithPredicatesStore(
      [{field: 'email', compare: '==', value: email}], 
      'sysAdmin', 
      'general', 
      'superusers')
    if (adminDoc.size === 1) {
      payload.isAdmin = true
      let userIdToken = await payload.getIdTokenResult()
      payload.roles = userIdToken.claims.roles || []
      commit('setUser', payload)
      commit('setUserLoading', false)
      dispatch('getAdminAnnouncements')
      dispatch('getActiveSupports')
      return Promise.resolve('Done')
    }
    let successFunc = async (doc) => {
      if (!doc.exists) throw Error('user doesnot exists')
      let userData = Object.assign({}, {uid}, doc.data())
      let user
      
      // load user dynamically based on it is real login or admin register user
      if (payload.getIdTokenResult) {
        // this is regular login
        user = payload
        let userIdToken = await user.getIdTokenResult()
        user.roles = userIdToken.claims.roles || []
      } else {
        // this is admin register as other user. 
        // we only change uid and email, keep the roles
        user = payload.user
        user.uid = payload.uid
        user.email = payload.email
        const {role = 1} = userData
        switch (role) {
          case 0: 
            user.roles = ['orgOwner']
            break
          case 1:
            if (userData.warehouses && userData.warehouses[0]) {
              const {users: warehouseUsers} = (await dbAccessor.queryStore('warehouses', userData.warehouses[0])).data()
              const {roles = []} = (warehouseUsers.find(({key}) => key === uid) || {})
              user.roles = roles
            } else if (userData.organizations && userData.organizations[0]) {
              const {users: orgUsers} = (await dbAccessor.queryStore('organizations', userData.organizations[0])).data()
              const {roles = []} = (orgUsers.find(({key}) => key === uid) || {})
              user.roles = roles
            } else {
              user.roles = ['user']
            }
            break
          case 2:
            user.roles = ['warehouseOwner']
            break
        } 
      }

      if (getters.user) {
        let shouldReloadTenantInformation = userData.workfor && (getters.tenantWorkFor.length === 0 || !deepEqual(userData.workfor, getters.activeWorkfor))
        
        // handle warehouse worker change
        let shouldReloadAfterWarehouseChange = !deepEqual(userData.warehouses, getters.userExtra.warehouses)
        // handle organization worker change
        let shouldReloadAfterOrganizationChange = !deepEqual(userData.organizations, getters.userExtra.organizations)
        commit('setExtra', userData)
        commit('setUser', user)
        commit('setLoading', false)

        if (shouldReloadAfterWarehouseChange || shouldReloadAfterOrganizationChange) {
          dispatch('logout')
          dispatch('reset_state')
          router.push('/')
        }
        return shouldReloadTenantInformation ? dispatch('getTenantInformation') : Promise.resolve('finished')
      } else {
        commit('setExtra', userData)
        commit('setUser', user)
        commit('setLoading', false)
        return dispatch('autoSignIn', {user, userData})
      }
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, [], 'users', uid)
    commit('addTosubscribed', {user: unsubscribe})
  },
  loadLocalSettings ({commit, getters}, payload) {
    let isEscClose = window.localStorage.getItem('isEscClose_' + getters.uid)
    isEscClose = isEscClose !== 'false'
    commit('setlocalSettings', {name: 'isEscClose', value: isEscClose})
  },
  requestJoin ({commit, getters}, payload) {
    const {requestCode, note} = payload
    let predicates = [{
      field: 'invitationCode',
      compare: '==',
      value: requestCode
    }]
    return dbAccessor.queryWithPredicates(predicates, ['tenants'])
      .then(docs => {
        if (docs.size > 1) return Promise.reject(Error('Deplicate invitation code. Contact support!'))
        if (docs.size === 0) return Promise.reject(Error('Invalid request code. Contact Organization!'))
        let doc = docs.docs[0]
        let tenant = {
          TenantID: doc.id,
          tenantName: doc.data().name
        }

        if (getters.tenantsForUser.some(item => item.tenantKey === tenant.TenantID || item.TenantID === tenant.TenantID)) {
          return Promise.reject(new Error('Already sent request to this organization.'))
        } 
        let newPayload = {
          uid: getters.uid,
          name: getters.userExtra.name,
          email: getters.userExtra.email,
          TenantID: tenant.TenantID,
          tenantName: tenant.tenantName,
          note
        }
        return dbAccessor.insertStore(newPayload, 'requests')
      })
  },
  getTenantInformation ({commit, getters}) {
    if (!getters.activeWorkfor) return
    
    let activeWorkfor = Object.keys(getters.activeWorkfor)
    activeWorkfor = activeWorkfor.filter((item) => {
      return getters.activeWorkfor[item] >= 2
    })
    let companies = []
    let promises = activeWorkfor.map((item) => {
      return dbAccessor.queryStore('tenantLimitedInfo', item)
        .then(doc => {
          let {name, companyName, pendingPeriod} = doc.data()
          let company = {
            tenantKey: item,
            status: 'accepted',
            tenantName: name || companyName,
            pendingPeriod: pendingPeriod
          }
          companies.push(company)
        })
    })
    return Promise.all(promises).then(() => {
      commit('setTenantWorkFor', companies)
    })
  },
  getTenantRequested ({commit, getters}) {
    let successFunc = (docs) => {
      let tenantRequested = []
      docs.forEach(doc => {
        const obj = doc.data()
        const tenantRequest = {
          TenantID: obj.TenantID,
          tenantName: obj.tenantName,
          status: 'pending',
          requestID: doc.id
        }
        tenantRequested.push(tenantRequest)
      })

      commit('setTenantRequested', tenantRequested)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let predicates = [{
      field: 'uid',
      compare: '==',
      value: getters.uid
    }]

    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, predicates, 'requests')
    commit('addTosubscribed', {requests: unsubscribe})
  },
  clearTenantRequested ({getters}) {
    getters.subscribed.requests && getters.subscribed.requests()
    delete getters.subscribed.requests
    state.tenantRequested = initialState.tenantRequested
  },
  cancelRequest ({commit, getters}, payload) {
    dbAccessor.removeStore('requests', payload)
    let tenantRequested = getters.tenantRequested
    for (let i = 0; i < tenantRequested.length; i++) {
      if (tenantRequested[i].requestID === payload) {
        tenantRequested.splice(i, 1)
        tenantRequested = [...tenantRequested]
      }
    }
    commit('setTenantRequested', tenantRequested)
  },
  async takeOffer ({commit, getters}, payload) {
    let nullFields = getNullFields(payload)
    if (nullFields.length > 0) {
      let error = `payload contains null value property (${nullFields.join(',')}). Confirm task canceled`
      console.error(error)
      return Promise.reject(Error(error))
    }
    Logger.log('takeOffer', payload)
    let predicates = [{
      field: 'offerKey',
      compare: '==',
      value: payload.offerKey
    },
    {
      field: 'warehouse',
      compare: '==',
      value: payload.warehouse
    },
    {
      field: 'uid',
      compare: '==',
      value: getters.uid
    },
    {
      field: 'price',
      compare: '==',
      value: payload.price
    },
    {
      field: 'bonus',
      compare: '==',
      value: payload.bonus
    }]

    let docs = await dbAccessor.queryWithPredicatesStore(predicates, 'tasks', 'tasks', 'active')

    return dbAccessor.runInTransactionStore(async (transaction) => {
      let offerRef = dbAccessor.buildStoreQuery(['offers', 'offers', 'active', payload.offerKey])
      let offerDoc = await transaction.get(offerRef)

      let theOffer = offerDoc.data()

      if (!theOffer || theOffer.quantity < theOffer.taken + payload.quantity) {
        throw Error('validation-failed')
      }
      let newTaskRef = dbAccessor.buildStoreQuery(['tasks', 'tasks', 'active']).doc()
      let newTask = dbAccessor.addNewDocTimestamp({
        ...payload, 
        uid: getters.uid, 
        userName: getters.userExtra.name,
        searchKeywords: [payload.offerKey, ...splitProductName(payload.productName), getters.userExtra.name]
      })

      if (docs.size > 0) {
        const taskDoc = docs.docs.find(doc => doc.get('isPropose') === false) || docs.docs[0]
        
        let {quantity, isPropose = false} = taskDoc.data()
        if (isPropose) {
          transaction.set(newTaskRef, newTask)
        } else {
          let transactionTaskDoc = await transaction.get(taskDoc.ref)
          transaction.update(transactionTaskDoc.ref, dbAccessor.addNewDocTimestamp({quantity: quantity + payload.quantity}))
        }
      } else {
        transaction.set(newTaskRef, newTask)
      } 
      transaction.update(offerDoc.ref, dbAccessor.addUpdateDocTimestamp({taken: theOffer.taken + payload.quantity}))
    })
  },
  getAllTasks ({commit, getters}, payload) {
    commit('setLoading', true)
    let successFunc = (docs) => {
      let tasks = docs.docs.map(doc => {
        const obj = convertTimestampToDateInObj(doc.data())
        const taskKey = doc.id
        obj.confirmedPackages && obj.confirmedPackages.forEach(item => {
          item.isConfirmed = true
        })
        return {...obj, taskKey}
      })
      commit('setTasks', tasks)
      commit('setLoading', false)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }
    // get all offers for a tenant or for a member
    let predicates = getters.activeOrganization ?
      [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      :
      [{
        field: 'uid',
        compare: '==',
        value: getters.uid
      }]
    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['tasks', 'tasks', 'active'], 'createTime', true)
    commit('addTosubscribed', {tasks: unsubscribe})
  },
  getHistoryTasksPagination ({commit, getters}, payload) {
    // get all offers for a tenant or for a member
    let predicates = getters.activeOrganization ?
      [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      :
      [{
        field: 'userKey',
        compare: '==',
        value: getters.uid
      }]
    
    predicates.push({
      field: 'transactionType',
      compare: '==',
      value: 'inbound'
    })

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
        field: `searchKeywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      }))

    return dbAccessor.queryWithPagination(predicates, ['transaction'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  getCanceledTasksPagination ({commit, getters}, payload) {
    let predicates = getters.activeOrganization ?
      [{
        field: 'tenantKey',
        compare: '==',
        value: getters.activeOrganization
      }]
      :
      [{
        field: 'uid',
        compare: '==',
        value: getters.uid
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
    
    payload.predicates && payload.predicates.predicateText && 
      (predicates.push({
        field: `searchKeywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      }))
    return dbAccessor.queryWithPagination(predicates, ['canceledTasks'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  getActiveTasksPagination ({commit, getters}, payload) {
    // get all offers for a tenant or for a member
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

    payload.predicates && payload.predicates.predicateText && 
      (predicates.push({
        field: `searchKeywords`,
        compare: 'array-contains',
        value: payload.predicates.predicateText
      }))
    
    return dbAccessor.queryWithPagination(predicates, ['tasks', 'tasks', 'active'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  async cancelTask ({commit, getters}, payload) {
    Logger.log('cancelTask', payload)
    let {task, cancelQuantity} = payload
    let isRemove = task.quantity === cancelQuantity

    if (getters.activeOrganization) {
      const taskDoc = (await dbAccessor.queryStore('tasks', 'tasks', 'active', task.taskKey || task._key))
      if (taskDoc.exists) {
        task = {...taskDoc.data(), taskKey: taskDoc.id}
        isRemove = task.quantity <= cancelQuantity
      } else {
        return 0
      }
    }
    if (task.isPropose) {
      if (isRemove) {
        await dbAccessor.removeStore('tasks', 'tasks', 'active', task.taskKey || task._key)
      } else {
        await dbAccessor.increaseValueInTransactionStore('quantity', -cancelQuantity, ['tasks', 'tasks', 'active', task.taskKey || task._key], undefined, false)
      }
    } else {
      if (isRemove) { 
        await dbAccessor.increaseValueAndDeleteDataInTransactionStore('taken', -task.quantity, 
          ['offers', 'offers', 'active', task.offerKey], ['tasks', 'tasks', 'active', task.taskKey || task._key], true, false, false)
      } else {
        let promises = []
        promises.push(dbAccessor.increaseValueInTransactionStore('taken', -cancelQuantity, ['offers', 'offers', 'active', task.offerKey], undefined, false))
        promises.push(dbAccessor.increaseValueInTransactionStore('quantity', -cancelQuantity, ['tasks', 'tasks', 'active', task.taskKey || task._key], undefined, false))
        await Promise.all(promises)
      }
    }
    await dbAccessor.insertStore({
      ...task, 
      cancelQuantity,     
      workerKey: getters.userExtra.uid,
      workerName: getters.userExtra.name
    }, 'canceledTasks')
    return (task.quantity - cancelQuantity)
  },
  clearAllTaskData ({getters, state}) {
    getters.subscribed.tasks && getters.subscribed.tasks()
    delete getters.subscribed.tasks
    state.tasks = initialState.tasks
  },
  addNurseAddress ({commit, getters}, payload) {
    dbAccessor.addArrayItemInTransactionStore('address', payload, 'userLimitedInfo', getters.userExtra.uid)
      .then(() => {
        let address = getters.sites
        address.push(payload)
        commit('setSites', address)
      })
  },
  editNurseAddress ({commit, getters}, payload) {
    // payload is {...address}
    let {newAddress, oldAddress} = payload
    return dbAccessor.queryStore('userLimitedInfo', getters.userExtra.uid)
      .then(doc => {
        let address = doc.data().address
        let payloadIndex = address.findIndex(address => address.siteName === oldAddress.siteName)
        if (payloadIndex < 0) throw new Error('Cannot find this site!')
        address[payloadIndex] = newAddress
        let newPayload = { address: address }
        return dbAccessor.updateFieldsStore(newPayload, 'userLimitedInfo', getters.userExtra.uid)
          .then(() => {
            commit('setSites', address)
          })
      })
  },
  subscribeUserInventory ({commit, getters}) {
    let successFunc = (inventoryCols) => {
      let inventory = inventoryCols.size > 0 ? inventoryCols.docs.map(doc => { return {...doc.data(), productKey: doc.id} }) : []
      commit('setUserInventory', inventory)
    }
    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }
    let predicates = [ {field: 'quantity', compare: '>', value: 0} ]
    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, predicates, 'userLimitedInfo', getters.userExtra.uid, 'inventory')
    commit('addTosubscribed', {userInventory: unsubscribe})
  },
  checkUserDistribution ({getters}, {state, zip, siteName}) {
    let {userInventory} = getters
    let distributionKey = btoa(`${state} - ${zip} - ${siteName}`)
    return !!(
      userInventory.filter(({distribution}) => 
        distribution && distribution[distributionKey] && distribution[distributionKey].quantity
      ).length
    )
  },
  async deleteNurseAddress ({commit, getters, dispatch}, payload) {
    let { reportLost } = getters
    let distributionKey = btoa(`${payload.state} - ${payload.zip} - ${payload.siteName}`)
    // Check report lost 
    let countReportLost = (reportLost ? 1 : 0)
      && reportLost.length 
      && reportLost.reduce((count, rl) => count + rl.distributionKey === distributionKey ? 1 : 0, 0)
    if (countReportLost > 0) throw new Error('Cannot remove this address because it has unconfirmed report lost!')

    // check distribution inventory
    let checkUserDistribution = await dispatch('checkUserDistribution', payload)
    if (checkUserDistribution) throw new Error('Cannot remove this address because it has inventory!') 

    let doc = await dbAccessor.queryStore('userLimitedInfo', getters.userExtra.uid)
    let { address } = doc.data()
    let payloadIndex = address.findIndex(address => address.siteName === payload.siteName)
    if (payloadIndex < 0) throw new Error('Cannot find this site!')
    address.splice(payloadIndex, 1)
    let newPayload = { address: address }
    await dbAccessor.updateFieldsStore(newPayload, 'userLimitedInfo', getters.userExtra.uid)
    let newAddress = getters.sites
    newAddress.splice(payloadIndex, 1)
    commit('setSites', [...address])
  },
  getUserSites ({commit, getters}, payload) {
    return dbAccessor.queryStore('userLimitedInfo', payload || getters.uid)
      .then((doc) => {
        if (doc.exists) {
          let sites = doc.data().address || []
          commit('setSites', sites)
        }
      })
  },
  getWarehouseName ({commit, getters}, payload) {
    dbAccessor.queryStore('warehouses', payload)
      .then((doc) => {
        commit('setWarehouseName', doc.data().name)
      })
  },
  
  async getPackagesByTrackings ({commit, getters}, payload) {
    let {trackingArr} = payload
    const doc = await dbAccessor.queryStore('tenants', payload.tenantKey, 'inventory', payload.productId)
    if (!doc.exists) throw Error('This organization is no longer collecting this product.')
    const {upc} = doc.data()
    if (!upc) throw Error(`Please wait for the organization to define this product's upc.`)
    const packagePromises = trackingArr.map(tracking => {
      const predicates = [
        {
          field: 'trackings',
          compare: 'array-contains',
          value: tracking
        },
        {
          field: 'upc',
          compare: '==',
          value: upc
        }
      ]
      return payload.warehouseKeys.map(warehouseKey => dbAccessor.queryWithPredicatesStore(predicates, 'warehouses', warehouseKey, 'packages'))
    })

    const trackings = trackingArr.map(tracking => {
      return payload.warehouseKeys.map(warehouseKey => tracking)
    }).flat(1)
    
    let packagesDocsArr = await Promise.all(packagePromises.flat(1))
    const matchedTrackings = new Set(packagesDocsArr.reduce((acc, docs, index) => {
      return (docs.empty || docs.docs[0].isAbnormal) ? acc : [...acc, trackings[index]]
    }, []))
    
    const unmatchedTrackings = trackingArr.filter(tracking => !matchedTrackings.has(tracking))
    // Convert package doc array to packages and remove sub-trackings which point to the same package
    let packages = packagesDocsArr.reduce((acc, docs, index) => [...acc, ...docs.docs.map(doc => {
      return doc.exists && !acc.some(item => item.packageID === doc.id) ? {
        ...doc.data(), 
        warehouseKey: doc.ref.path.split('/')[1],
        trackingConfirmed: [trackings[index]],
        packageID: doc.id,
        isTaskTooOldForPkg: subDays(doc.data().createTime.toDate(), 45) > payload.taskCreateTime
      } : {isDupPackage: true, trackingConfirmed: trackings[index], packageID: doc.id}
    })], [])
    // Add sub-trackings to the ConfirmedTackings list
      .reduce((acc, pkg) => {
        if (pkg.isDupPackage) {
          acc.find(item => item.packageID === pkg.packageID).trackingConfirmed.push(pkg.trackingConfirmed)
          return acc
        } else {
          return [...acc, pkg]
        }
      }, [])

    return {unmatchedTrackings, searchedPackages: convertTimestampToDateInObj(packages)}
  },
  confirmTask ({commit, getters, dispatch}, payload) {
    let nullfields = getNullFields(payload)
    if (nullfields.length > 0) {
      let error = `payload contains null value property (${nullfields.join(',')}). Confirm task canceled`
      return Promise.reject(Error(error))
    }
    Logger.log('confirmTask', payload)
    payload.uid && (payload.userKey = payload.uid)
    delete payload.uid
    delete payload.warehouseKeys
    delete payload.expirationDate
    payload.createTime = payload.createTime.toISOString()
    commit('updatePingHistory', 'confirmTask')
    return dbAccessor.callFunction('confirmTask', payload)
      .catch(error => {
        let errorCode = error.message.slice(25).trim()
        if (errorCode === 'quantity-error') {
          throw Error('Package quantity exceed maximum task amount!!!')
        } else if (error.message === 'upc-unmatch') {
          throw Error('Package upc has been changed, please search again.')
        }
        throw error
      })
  },
  saveTrackings ({commit, getters}, payload) {
    const newPayload = {
      trackingNums: payload.trackingNums
    }
    dbAccessor.updateFieldsStore(newPayload, 'tasks', 'tasks', 'active', payload.taskId)
  },
  uploadLabels ({commit, getters}, payload) {
    return dbAccessor.uploadFile(payload, 'labels')
  },
  uploadFiles ({commit, getters}, payload) {
    let {newFile, type, newName} = payload
    return dbAccessor.uploadFile(newFile, type, newName)
  },
  removeFile ({commit, getters}, payload) {
    return dbAccessor.removeFile(payload)
  },
  downloadFile ({commit, getters}, payload) {
    return dbAccessor.downloadFile(payload.fullPath, payload.name)
  },
  getBalanceForUser ({commit, getters}, payload) {
    // todo: need refactor
    getters.subscribed.balanceForUser && getters.subscribed.balanceForUser()
    delete getters.subscribed.balanceForUser
    state.balanceForUser = initialState.balanceForUser
    let balanceKey = `${payload}_${getters.uid}`

    let successFunc = (doc) => {
      let balance = doc.data()
      balance.balanceKey = doc.id
      commit('setBalanceForUser', balance)
    }

    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['balance', balanceKey])
    commit('addTosubscribed', {balanceForUser: unsubscribe})
  },
  clearBalanceForUserData ({getters, state}) {
    getters.subscribed.balanceForUser && getters.subscribed.balanceForUser()
    delete getters.subscribed.balanceForUser
    state.balanceForUser = initialState.balanceForUser
  },
  resetBalance ({commit, getters}) {
    state.balanceForUser = initialState.balanceForUser
  },
  getAllTenantLimitedInfo ({commit, getters}) {
    return dbAccessor.queryStore('tenantLimitedInfo')
      .then((docs) => {
        let tenantLimitedInfo = {}
        let workFor = getters.activeWorkfor
        docs.forEach((doc) => {
          workFor && workFor[doc.id] && workFor[doc.id] > 0 && (tenantLimitedInfo[doc.id] = doc.data())
        })
        return commit('setAllTenantLimitedInfo', tenantLimitedInfo)
      })
  },
  addPaymentRequest ({commit, getters, dispatch}, payload) {
    let nullfields = getNullFields(payload)
    if (nullfields.length > 0) {
      let error = `payload contains null value property (${nullfields.join(',')}). Add payment canceled`
      return Promise.reject(Error(error))
    }

    payload[`lastRead_${getters.uid}`] = dbAccessor.getServerTimestamp()
    payload.userKey = getters.uid
    payload.userName = getters.userExtra.name
    let {tenantKey, userKey, amount} = payload
    Logger.log('addPaymentRequest', payload)
    return dbAccessor.runInTransactionStore(async transaction => {
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['balance', `${tenantKey}_${userKey}`]))
      let paymentRef = dbAccessor.buildStoreQuery(['paymentRequest']).doc()
      let {released, total} = balanceDoc.data()
      if (released >= amount && total >= amount) {
        transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({released: released - amount}))
        transaction.set(paymentRef, dbAccessor.addNewDocTimestamp(payload))
      } else {
        throw Error('Negative balance.')
      }
    })
      .catch((error) => {
        Logger.critical('addPaymentRequest', error.message)
      })
  },
  updatePaymentRequest ({commit, getters, dispatch}, payload) {
    let nullfields = getNullFields(payload)
    if (nullfields.length > 0) {
      let error = `payload contains null value property (${nullfields.join(',')}). Add payment canceled`
      return Promise.reject(Error(error))
    }

    let method = payload.method
    Logger.log('updatePaymentRequest', payload)
    return dbAccessor.runInTransactionStore(async transaction => {
      let paymentRequestDoc = await transaction.get(dbAccessor.buildStoreQuery(['paymentRequest', payload.paymentKey]))
      if (!paymentRequestDoc.exists) throw Error('Payment request has been removed or paid')

      transaction.update(paymentRequestDoc.ref, dbAccessor.addUpdateDocTimestamp({method}))
    })
  },
  setPaymentRequestStar ({commit, getters, dispatch}, payload) {
    return dbAccessor.runInTransactionStore(async transaction => {
      let paymentRequestDoc = await transaction.get(dbAccessor.buildStoreQuery(['paymentRequest', payload.paymentKey]))
      if (!paymentRequestDoc.exists) throw Error('Payment request has been removed or paid')
      let starStatus = paymentRequestDoc.data().starStatus
      if (!(starStatus instanceof Array) || starStatus.length !== 2) starStatus = [false, false]
      starStatus[payload.starIndex] = !starStatus[payload.starIndex]
      transaction.update(paymentRequestDoc.ref, { starStatus })
    })
  },
  getPaymentRequestForUser ({commit, getters}) {
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
      field: 'userKey',
      compare: '==',
      value: getters.uid
    }]

    let unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, predicates, ['paymentRequest'], 'createTime', false)
    commit('addTosubscribed', {paymentRequests: unsubscribe})
  },
  clearPaymentRequestData ({getters, state}) {
    getters.subscribed.paymentRequests && getters.subscribed.paymentRequests()
    delete getters.subscribed.paymentRequests
    state.paymentRequests = initialState.paymentRequests
  },
  addPaymentMethod ({getters, commit}, payload) {
    dbAccessor.queryStore('users', getters.uid)
      .then((doc) => {
        let paymentMethods = doc.data().paymentMethods
        if (payload.index === -1) {
          paymentMethods.push(payload.paymentMethod)
        } else {
          paymentMethods[payload.index] = payload.paymentMethod
        }
        let newPayload = {
          paymentMethods: paymentMethods
        }
        dbAccessor.updateFieldsStore(newPayload, 'users', getters.uid)
      })   
  },
  deletePaymentMethod ({getters, commit}, payload) {
    const {displayName} = payload
    dbAccessor.queryStore('users', getters.uid)
      .then((doc) => {
        let paymentMethods = doc.data().paymentMethods
        paymentMethods = paymentMethods.filter(item => item.displayName !== displayName)
        return dbAccessor.updateFieldsStore({paymentMethods}, 'users', getters.uid)
      })   
  },
  getPaymentMethod ({getters, commit}) {
    commit('setLoading', true)
    let successFunc = (doc) => {
      let paymentMethods = doc.data().paymentMethods.map(method => {
        method.filter = Object.values(method).join(' ')
        return method
      })
      commit('setPaymentMethods', paymentMethods)
      commit('setLoading', false)
    }
    let errorFunc = (error) => {
      console.log(error)
      commit('setLoading', false)
      throw error
    }
    let predicates = []
    let unsubscribe = dbAccessor.queryStoreRT(successFunc, errorFunc, predicates, 'users', getters.uid)
    commit('addTosubscribed', {paymentMethods: unsubscribe})
  },
  getPendingTransactionForUser ({commit, getters}) {
    commit('setLoading', true)
    let predicates = [
      {
        field: `userKey`,
        compare: '==',
        value: getters.uid
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
  getHistoryTransactionForUser ({commit, getters}, payload) {
    let predicates = [
      {
        field: `userKey`,
        compare: '==',
        value: getters.uid
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

    if (payload && payload.predicates && payload.predicates.predicateCheckBox) {
      predicates.push({
        field: `transactionType`,
        compare: '==',
        value: 'payment'
      })
    }

    return dbAccessor.queryWithPagination(predicates, ['transaction'], 'createTime', true, payload && payload.startAfter, payload && payload.limit)
  },
  cancelUserPaymentRequest ({commit, getters}, payload) {
    Logger.log('cancelUserPaymentRequest', payload)
    let balanceKey = `${payload.tenantKey}_${payload.userKey}`
    return dbAccessor.runInTransactionStore(async transaction => {
      let paymentRequestDoc = await transaction.get(dbAccessor.buildStoreQuery(['paymentRequest', payload.paymentKey]))
      if (!paymentRequestDoc.exists) throw Error('Payment request has been removed or canceled by the user')
      let balanceDoc = await transaction.get(dbAccessor.buildStoreQuery(['balance', balanceKey]))
      if (!balanceDoc.exists) throw Error('balance doc is missing')
      let {released} = balanceDoc.data()
      released = addNumbers(released, payload.amount)

      transaction.delete(paymentRequestDoc.ref)
      transaction.update(balanceDoc.ref, dbAccessor.addUpdateDocTimestamp({released}))
    })
      .then(() => {
        if (balanceKey === getters.balanceForUser.balanceKey) {
          let balance = getters.balanceForUser
          balance.released += payload.amount
          return commit('setBalanceForUser', balance)
        }
      })
  },
  addComment ({getters, commit}, payload) {
    let {comment, docPath, commentsField} = payload
    return dbAccessor.updateFieldAddToArrayStore(commentsField, comment, ...docPath)
  },
  removeComment ({getters, commit}, payload) {
    let {comment, docPath, commentsField} = payload
    comment = convertTimestampToDateInObj(comment)
    let createTime
    if (comment.createTime) {
      createTime = comment.createTime
    } else { return Promise.reject(Error('create time missing')) }
    let predicate = {
      field: 'createTime',
      value: createTime
    }
    return dbAccessor.updateFieldRemoveOneFromArrayStore(commentsField, predicate, ...docPath)
  },
  updateCommentLastRead ({commit, getters}, payload) {
    const {docPath, readTime, commentsField} = payload
    let lastReadUid = (commentsField !== 'comments' && commentsField !== undefined) ? 
      `lastRead_${commentsField}_${getters.uid}` :
      `lastRead_${getters.uid}`
    let newPayload = {
      // server time is different from local machine. And array doesn't support server time
      [lastReadUid]: readTime || new Date() 
    }
    dbAccessor.updateFieldsStore(newPayload, ...docPath)
  },
  getWarehousesForUser ({getters, commit}) {
    let tenantKeys = Object.keys(getters.activeWorkfor)
    let warehouses = {}
    let promises = tenantKeys.map((key) => {
      return dbAccessor.queryStore('tenantLimitedInfo', key)
        .then(doc => {
          let warehousesIn = doc.data().warehouses
          warehouses = {...warehouses, ...warehousesIn}
        })
    })
    return Promise.all(promises)
      .then(() => {
        let warehousesFin = Object.values(warehouses)
        warehousesFin.forEach((warehouseFin, index) => {
          warehouseFin.warehouseKey = Object.keys(warehouses)[index]
        })
        commit('setWarehousesForUser', warehousesFin)
      })
  },
  getUserInventory ({getters, commit}, payload) {
    let predicates = [
      {
        field: `tenantKey`,
        compare: '==',
        value: payload
      }
    ]
    return dbAccessor.queryWithPredicatesStore(predicates, 'userLimitedInfo', getters.uid, 'inventory')
  },
  getAllRegistrationCode ({getters, commit}) {
    return dbAccessor.queryWithPredicates([], ['sysAdmin', 'general', 'codes'], 'createTime', false)
  },
  addRegistrationCode ({getters, commit}, {type = 'tenant'}) {
    let newCode = dbAccessor.getNewDocumentKey('sysAdmin', 'general', 'codes').id
    let payload = {code: newCode, type}
    return dbAccessor.insertStore(payload, 'sysAdmin', 'general', 'codes')
      .then(() => {
        payload.createTime = new Date()
        return payload 
      })
  },
  getReportLostUser ({commit, getters}) {
    let predicates = [{
      field: `userKey`,
      compare: '==',
      value: getters.userExtra.uid
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
  addLostReport ({getters, commit, dispatch}, payload) {
    Logger.log('addLostReport', payload)
    payload.userKey = getters.userExtra.uid
    payload.userName = getters.userExtra.name
    let userRef = dbAccessor.buildStoreQuery(['userLimitedInfo', payload.userKey, 'inventory', payload.productKey])
    let addReportRef = dbAccessor.buildStoreQuery(['reportLost']).doc()
    let productRef = dbAccessor.buildStoreQuery(['tenants', payload.tenantKey, 'inventory', payload.productId])
    
    return dbAccessor.runInTransactionStore(transaction => {
      return Promise.all([transaction.get(userRef), transaction.get(productRef)])
        .then(docArray => {
          let {condition, name} = docArray[1].data()
          let price = docArray[0].data().price || 0
          payload = {...payload, condition, price, name}
          payload.upc = docArray[1].data().upc
          docArray[1].data().asin && (payload.asin = docArray[1].data().asin)
          let newPayload = {}
          let distribution = docArray[0].data().distribution
          newPayload.quantity = docArray[0].data().quantity - payload.quantity
          if (distribution[payload.distributionKey].quantity <= payload.quantity) {
            delete distribution[payload.distributionKey] 
          } else {
            distribution[payload.distributionKey].quantity -= payload.quantity
          }

          newPayload.distribution = distribution
          transaction.update(userRef, dbAccessor.addUpdateDocTimestamp(newPayload))
          transaction.set(addReportRef, dbAccessor.addNewDocTimestamp(payload))
          transaction.update(productRef, dbAccessor.addUpdateDocTimestamp({}))
        })
    })
  },
  getTenantLimitedInfoForUser ({getters, commit}, payload) {
    return dbAccessor.queryStore('tenantLimitedInfo', payload)
  },
  confirmShipment ({commit, getters}, payload) {
    Logger.log('confirmShipment', payload)
    let userType
    if (getters.activeOrganization) {
      userType = 'tenant'
    } else if (getters.activeWarehouse) {
      userType = 'warehouse'
    } else {
      userType = 'user'
    }
    const workerKey = getters.userExtra.uid
    const workerName = getters.userExtra.name
    payload.draftComments.forEach(comment => {
      comment.createTime = comment.createTime.toISOString ? comment.createTime.toISOString() : comment.createTime
    })
    return dbAccessor.callFunction('confirmShipment', {payload, userType, workerKey, workerName})
      .catch((error) => {
        const msg = dbAccessor.getCallFunctionErrMsg(error)
        switch (msg) {
          case 'shipment-missing':
            throw Error('Shipment missing.')
          case 'quantity-error':
            throw Error('Quantity error.')
          case 'user inventory missing':
          case 'inventory-missing':
            throw Error('Inventory missing.')
          case 'distribution-quantity-error':
            throw Error('Distribution quantity error.')
          default:
            throw error
        }
      })
  },
  updateAnnouncement ({commit, getters}, payload) {
    let announcement = new Announcement(payload)
    return announcement.update()
  },
  addAnnouncement ({commit, getters}, payload) {
    let broadcasterType = ''
    let broadcasterName = ''
    let broadcasterKey = ''
    if (getters.activeOrganization) {
      broadcasterType = Announcement.tenantCode
      broadcasterName = getters.tenant.name
      broadcasterKey = getters.activeOrganization
    } else if (getters.activeWarehouse) {
      broadcasterType = Announcement.warehouseCode
      broadcasterName = getters.warehouseName
      broadcasterKey = getters.activeWarehouse
    } else if ((getters.user || {}).isAdmin) {
      broadcasterType = Announcement.systemCode
      broadcasterName = 'System'
      broadcasterKey = 'sys'
    }
    if (!broadcasterType) {
      throw Error('Error announcement sender')
    }
    let announcement = new Announcement({
      ...payload, 
      broadcasterKey,
      broadcasterType,
      broadcasterName
    })
    return announcement.insert()
  },
  deleteAnnouncement ({commit, getters}, payload) {
    return (payload instanceof Announcement) ? payload.delete() : Announcement.deleteByKey(payload._key)
  },
  async getAllAnnouncements ({commit, getters}) {
    let generalCbFunc = (key) => {
      let cbFunc = (data) => {
        let today = new Date()
        let newAnnouncementsMap = new Map([...getters.announcementsMap])
        newAnnouncementsMap.set(key, data
          .filter(({startDate}) => startDate <= today)
          .sort((announcement1, announcement2) => parseInt(announcement2.startDate - announcement1.startDate)))
        commit('setAnnouncementsMap', newAnnouncementsMap)
      }
      return cbFunc
    }

    let {activeWorkfor = {}, activeOrganization, warehouses = [], activeWarehouse} = getters
    let sysAnnouncementsSubscribe = 
      Announcement.getSysAnnouncementsRT(Announcement.getUserTypeCode(activeOrganization, activeWarehouse), generalCbFunc('sys'))
    commit('addTosubscribed', {sysAnnouncementsReciever: sysAnnouncementsSubscribe})  
    // assert warehouse user
    if (activeWarehouse) return
    // assert tenant user
    if (activeOrganization) {
      warehouses
        .filter(({warehouseKey}) => warehouseKey !== '' && warehouseKey !== activeOrganization)
        .forEach(({warehouseKey}) => {
          let unsubscribe = Announcement.getWarehouseAnnouncementsRT(warehouseKey, generalCbFunc(warehouseKey))
          commit('addTosubscribed', {[`warehouseAnnouncement_${warehouseKey}`]: unsubscribe})
        })
      return
    }
    // individual collect org!
    Object.keys(activeWorkfor)
      .forEach((tenantKey) => {
        let unsubscribe = Announcement.getTenantAnnouncementsRT(tenantKey, generalCbFunc(tenantKey))
        commit('addTosubscribed', {[`tenantAnnouncement_${tenantKey}`]: unsubscribe})
      })
  },
  updateUserExtraReadList ({commit, getters}, payload) {
    if (!getters.userExtra) return
    let storeReadList = getters.userExtra.announcementsReadList || []
    if ( 
      payload.length === storeReadList.length &&
      !(payload.filter(key => !(storeReadList.includes(key))).length)
    ) return 
    return dbAccessor.updateFieldsStore({
      announcementsReadList: payload
    }, 'users', getters.userExtra.uid)
  },
  getAdminAnnouncements ({commit, getters}, payload) {
    const cbFunc = (data) => {
      commit('setAdminAnnouncements', data)
    }
    let unsubscribe = Announcement.getByAdminRT(cbFunc)
    commit('addTosubscribed', {tenantAnnouncements: unsubscribe})
  },
  sendNewCommentsByEmail ({commit, getters}, payload) {
    return dbAccessor.callFunction('sendNewCommentsByEmail', payload)
  },
  addNotification ({commit, getters}, payload) {
    if (!payload.key) return 

    commit('removeNotification', payload)
    commit('addNotification', payload)
  },
  /** @param {{fullPath: string}} payload */
  getStorageFileUrl ({getters}, payload) {
    return dbAccessor.getFileUrl(payload.fullPath)
  },
  /** @param {{predicates: Predicate[]}} payload */
  async searchPackagesInAllWarehouse ({getters}, payload) {
    const {predicates} = payload
    if (!Array.isArray(predicates) || predicates.length === 0) return []
    const querySnapshots = await dbAccessor.queryCollectionGroup(
      predicates,
      'packages'
    )
    return querySnapshots.size ?
      querySnapshots.docs.map(doc => {
        const warehouseKey = doc.ref.path.split('/')[1]       
        return new Package(Package._extractDoc(doc), warehouseKey, getters.uid) 
      }) :
      []
  },
  getFavoritePackages ({getters}, payload) {
    let predicates = [
      {field: 'favorites', compare: 'array-contains', value: getters.uid}
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

    return dbAccessor.queryCollectionGroupWithPagination(predicates, 'packages', 'createTime', true, payload && payload.startAfter, payload && payload.limit)
      .then(querySnapshots => querySnapshots.size ?
        {models: querySnapshots.docs.map(doc => {
          const warehouseKey = doc.ref.path.split('/')[1]       
          return new Package(Package._extractDoc(doc), warehouseKey, getters.uid) 
        }),
        docs: querySnapshots} : {models: [], docs: querySnapshots})
  },
  /** 
   * @param {{docPath: string[], cbFunc: function}} payload 
   * @returns {function}
   */
  subscribeComments ({getters}, payload) {
    const {cbFunc, docPath = []} = payload
    if (typeof cbFunc !== 'function') throw Error('cbFunc-must-be-function')
    return dbAccessor.queryStoreRT(
      (doc) => (doc.exists && cbFunc(convertTimestampToDateInObj(doc.data()))) || {},
      (err) => { console.error(err) }, 
      [], ...docPath
    )
  },
  /**
   * 
   * @param {{
   *  isFavorite: boolean, 
   *  warehouseKey: string,
   *  packageKey: string,
   *  uid: string
   * }} payload 
   * @returns {boolean}
   */
  setPackageFavorite ({getters}, payload) {
    return (payload.isFavorite ? 
      dbAccessor.updateFieldAddToSetArray(
        ['warehouses', payload.warehouseKey, 'packages', payload.packageKey],
        'favorites', payload.uid
      ) :
      dbAccessor.updateFieldRemoveFromSetArray(
        'favorites', payload.uid, 
        ['warehouses', payload.warehouseKey, 'packages', payload.packageKey]
      ))
      .then(() => payload.isFavorite)
  },
  async addUserToAdmin ({commit, getters, dispatch}, payload) {
    const {email, roles} = payload
    let predicates = [{
      field: 'email',
      compare: '==',
      value: email
    }]
    let docs = await dbAccessor.queryWithPredicatesStore(predicates, 'users')

    if (docs.size === 0) {
      throw Error('Email address not found.')
    }
    const userDoc = docs.docs[0]
    const {name, warehouses = [], workfor, organizations = []} = userDoc.data()
    if (warehouses.length || workfor || organizations.length) {
      throw Error('Cannot add staff(member) from other organization.')
    }
    return dbAccessor.updateStore({
      name,
      email,
      roles
    }, 'sysAdmin', 'general', 'superusers', userDoc.id)
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email,
          roles
        })
      })
  },
  async removeUserFromAdmin  ({commit, getters, dispatch}, payload) {
    return dbAccessor.removeStore('sysAdmin', 'general', 'superusers', payload.key)
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email: payload.email,
          roles: ['user']
        })
      })
  },
  async editUserForAdmin  ({commit, getters, dispatch}, payload) {
    // is there security risk?
    const {email, key, roles} = payload
    return dbAccessor.updateFieldsStore({roles}, 'sysAdmin', 'general', 'superusers', key)
      .then(() => {
        return dbAccessor.callFunction('grantUserRole', {
          email,
          roles
        })
      })
  },
  getSuperUsers ({commit, getters}) {
    const successFunc = (docs) => {
      const users = docs.docs.map(doc => {
        const obj = convertTimestampToDateInObj(doc.data())
        return {...obj, key: doc.id}
      })
      commit('setSuperUsers', users)
    }

    const errorFunc = (error) => {
      console.log(error)
      throw error
    }
    const unsubscribe = dbAccessor.queryRT(successFunc, errorFunc, [], ['sysAdmin', 'general', 'superusers'], 'createTime', false)
    commit('addTosubscribed', {superUsers: unsubscribe})
  },
  async unsubscribleOrg ({commit, getters}, {tenantKey, tenantName}) {
    const {uid: userKey, name: userName, email} = getters.userExtra
    const balanceDoc = await dbAccessor.queryStore('balance', `${tenantKey}_${userKey}`)
    const {total = 0} = balanceDoc.data() || {}
    const isBalanceClean = total === 0
    const isInventoryClean = getters.userInventory
      .filter(inventory => inventory.tenantKey === tenantKey)
      .every(item => !item.quantity)
    const isProposeClean = !getters.proposes
      .filter(item => item.tenantKey === tenantKey)
      .length
    const isReportLostClean = !getters.reportLost
      .filter(item => item.tenantKey === tenantKey)
      .length

    if (!isBalanceClean) throw Error('Balance not clean.')
    if (!isInventoryClean) throw Error('Inventory not clean.')
    if (!isProposeClean) throw Error('Propose not clean.')
    if (!isReportLostClean) throw Error('ReportLost not clean.')

    await dbAccessor.callFunction('unsubscribeOrg', {tenantKey, userKey})
    await Logger.changeLog({
      beforeValue: {}, 
      actionPayload: {
        tenantKey, 
        userKey,
        email,
        userName,
        tenantName
      },
      actionName: 'unsubscribleOrg',
      categories: ['userInfo'],
      keys: [tenantKey, userKey],
      keywords: [        
        tenantKey, 
        userKey,
        email,
        userName,
        tenantName
      ]
    })
  }
}

export const getters = {
  userLoading (state) {
    return state.userLoading
  },
  user (state) {
    return state.user
  },
  uid (state) {
    return state.user ? state.user.uid : '' 
  },
  sites (state) {
    return state.sites
  },
  userExtra (state) {
    return state.userExtra
  },
  isRegularUser () {
    return state.userExtra && state.userExtra.role === 1
  },
  activeOrganization (state) {
    return state.userExtra && state.userExtra.organizations && state.userExtra.organizations[0]
  },
  activeWorkfor (state) {
    return state.userExtra && state.userExtra.workfor
  },
  activeWarehouse (state) {
    return state.userExtra && state.userExtra.warehouses && state.userExtra.warehouses[0]
  },
  tenantWorkFor (state) {
    return state.tenantWorkFor
  },
  tenantRequested (state) {
    return state.tenantRequested
  },
  tenantsForUser (state) {
    let tenantWorkFor = state.tenantWorkFor
    let tenantRequested = state.tenantRequested
    if (tenantWorkFor && tenantWorkFor.length > 0) {
      let tenants = tenantWorkFor.map(tenant => {
        let {status, tenantKey, tenantName} = tenant
        return {
          tenantKey,
          tenantName,
          status
        }
      })
      return [...tenants, ...tenantRequested]
    } else {
      return [...tenantRequested]
    }
  },
  tasks (state) {
    return state.tasks
  },
  historyTasks (state) {
    return state.historyTasks
  },
  balanceForUser (state) {
    return state.balanceForUser
  },
  paymentRequests (state) {
    return state.paymentRequests
  },
  paymentMethods (state) {
    return state.paymentMethods
  },
  allTenantLimitedInfo (state) {
    return state.allTenantLimitedInfo
  },
  warehousesForUser (state) {
    return state.warehousesForUser
  },
  paymentRequestFilterItems (state) {
    return state.paymentRequestFilterItems
  },
  userInventory (state) {
    return state.userInventory
  },
  announcementsMap (state) {
    return state.announcementsMap
  },
  adminAnnouncements (state) {
    return state.adminAnnouncements
  },
  notifications (state) {
    return state.notifications
  },
  localSettings (state) {
    return state.localSettings
  },
  popupStack (state) {
    return state.popupStack
  },
  superUsers (state) {
    return state.superUsers
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}
