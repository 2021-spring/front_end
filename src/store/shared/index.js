import * as dbAccessor from '@/utils/dbAccessor'
import { differenceInMinutes } from 'date-fns'
import routes from '@/router/routeDefinition'
import {roleToFunctionalityDisplayNameMap} from '@/router/functionalityAuth'
import {countryCodeArray} from './countryCode'

const initialState = {
  loading: false,
  loadingMembers: false,
  error: null,
  states: [
    'Alabama', 'Alaska', 'American Samoa', 'Arizona',
    'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'District of Columbia', 'Federated States of Micronesia',
    'Florida', 'Georgia', 'Guam', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Marshall Islands', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Northern Mariana Islands', 'Ohio',
    'Oklahoma', 'Oregon', 'Palau', 'Pennsylvania', 'Puerto Rico',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
    'Texas', 'Utah', 'Vermont', 'Virgin Island', 'Virginia',
    'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  statesToAbbrev: {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'American Samoa': 'AS',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'Washington DC': 'DC',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'
  },
  toastEnable: false,
  toastText: '',
  toastColor: 'error',
  pingHistory: {},
  routes,
  permissionValueToText: new Map([
    ['orgOwner', 'Owner'],
    ['orgStaff', 'Staff'],
    ['orgLogisticAdmin', 'Logistic admin'],
    ['orgLogisticOperator', 'Logistic operator'],
    ['orgBilling', 'Billing'],
    ['orgPayment', 'Payment'],
    ['orgGeneralSetting', 'General setting'],
    ['warehouseOwner', 'Owner'],
    ['warehouseStaff', 'Staff'],
    ['warehouseOrgAdmin', 'Organization admin'],
    ['warehouseBillingAdmin', 'Billing admin'],
    ['warehouseInventoryAdmin', 'Inventory admin'],
    ['warehouseInventoryViewer', 'Inventory viewer'],
    ['warehouseReport', 'Report'],
    ['warehouseSupport', 'Support'],
    ['warehouseOperator', 'Warehousing operator'],
    ['warehouseSetting', 'Warehousing setting'],
    ['sysAdmin', 'System admin'],
    ['sysAdminStaff', 'System admin staff']
  ])
}

const state = Object.assign({}, initialState)

export const mutations = {
  reset_state (state) {
    for (let prop in state) {
      state[prop] = initialState[prop]
    }
  },
  setLoading (state, payload) {
    state.loading = payload
  },
  setLoadingMembers (state, payload) {
    state.loadingMembers = payload
  },
  setError (state, payload) {
    state.error = payload
    console.error(payload)
  },
  clearError (state) {
    state.error = null
  },
  setToast (state, payload) {
    state.toastText = payload.info
    state.toastEnable = true
    state.toastColor = payload.level || 'error'
  },
  setToastEnable (state) {
    state.toastEnable = false
  },
  updatePingHistory (state, payload) {
    console.log('update ping history: ', payload)
    state.pingHistory[payload] = new Date()
  }
}

export const actions = {
  reset_state ({commit}) {
    commit('reset_state')
  },
  setLoading ({commit}, payload) {
    commit('setLoading', payload)
  },
  clearError ({commit}) {
    commit('clearError')
  },
  raiseError ({commit}, payload) {
    commit('setError', payload)
  },
  showToast ({commit}, payload) {
    commit('setToast', payload)
    if (payload.level === 'error') {
      console.error(payload.info)
    }
    setTimeout(() => {
      commit('setToastEnable', false)
    }, 5000)
  },
  closeToast ({commit}) {
    commit('setToastEnable', false)
  },
  wakeupServerFunction ({commit, state}, payload) {
    const data = {ping: true}
    let minuteSinceLastRun = state.pingHistory[payload] ? differenceInMinutes(state.pingHistory[payload], new Date()) : 9999
    console.log('minuteSinceLastRun: ', minuteSinceLastRun)
    minuteSinceLastRun > 30 && dbAccessor.callFunction(payload, data)
      .then(rtn => {
        console.log('wake up: ', payload)
        commit('updatePingHistory', payload)
      })
      .catch(error => {
        console.error('wake up: ', payload, error)
      })
  },
  sendSuggestion ({commit, state}, payload) {
    payload.overrideKey = '20180601'
    return dbAccessor.callFunction('sendSuggestion', payload)
  },
  async getUpcDetails ({commit, state}, payload) {
    return dbAccessor.callFunction('query', {
      type: 'getUpcDetails',
      ...payload
    })
      .then(rtn => rtn.data)
  }
}

export const getters = {
  loading (state) {
    return state.loading
  },
  loadingMembers (state) {
    return state.loadingMembers
  },
  error (state) {
    return state.error
  },
  states (state) {
    return state.states
  },
  toastText (state) {
    return state.toastText
  },
  toastEnable (state) {
    return state.toastEnable
  },
  toastColor (state) {
    return state.toastColor
  },
  permissionValueToText (state) {
    return state.permissionValueToText
  },
  roleToComponentMap (state) {
    let {routes} = state
    let roleToComponentMap = new Map()

    Object.keys(routes).forEach(key => {
      if (routes[key].meta) {
        const {auth, displayName} = routes[key].meta
        auth.forEach(item => {
          if (!roleToComponentMap.has(item)) {
            roleToComponentMap.set(item, [])
          }
          roleToComponentMap.get(item).push(displayName)
        })
      }
    })

    roleToFunctionalityDisplayNameMap.forEach((value, key) => {
      if (!roleToComponentMap.has(key)) {
        roleToComponentMap.set(key, [])
      }
      roleToComponentMap.set(key, [...roleToComponentMap.get(key), ...value])
    })

    roleToComponentMap.forEach((value, key) => {
      value.sort()
    })
    return roleToComponentMap
  },
  allRoles (state, getters) {
    return [...getters.roleToComponentMap.keys()]
      .filter(item => 
        item.startsWith(getters.activeOrganization ? 'org' : 'warehouse') &&
        item !== 'orgOwner' &&
        item !== 'warehouseOwner')
  },
  adminRoles (state, getters) {
    return [...getters.roleToComponentMap.keys()]
      .filter(item => item.startsWith('sysAdmin'))
  },
  statesToAbbrev (state, getters) {
    return state.statesToAbbrev
  },
  stateAbbrevs (state) {
    return Object.values(state.statesToAbbrev)
  },
  abbrevToStates (state, getters) {
    let abbrevToStates = {}
    Object.keys(state.statesToAbbrev).forEach(key => {
      abbrevToStates[state.statesToAbbrev[key]] = key
    })
    return abbrevToStates
  },
  otherServices () {
    return [
      {value: 'label', displayName: 'Label'}, 
      {value: 'photo', displayName: 'Photo'}, 
      {value: 'SN', displayName: 'SN'}
    ]
  },
  countryCodeArray () {
    return countryCodeArray.map(item => {
      return {
        value: item[0],
        name: item[1]
      }
    })
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}
