import {store} from '../store'

function reverseMap (roleToFunctionalityMap) {
  let functionalityToRoleMap = new Map()
  roleToFunctionalityMap.forEach((value, key) => {
    value.forEach(valueItem => {
      if (!functionalityToRoleMap.has(valueItem)) {
        functionalityToRoleMap.set(valueItem, [])
      }
      functionalityToRoleMap.get(valueItem).push(key)
    })
  })
  return functionalityToRoleMap
}

function hasIntersect (arr1, arr2) {
  const set = new Set(arr1)
  return arr2.some(item => set.has(item))
}

/**
 * main relation map of this module
 */
const roleToFunctionalityMap = new Map([
  ['warehouseInventoryAdmin', [
    'updatePkgsInfo', 
    'adjustInventory'
  ]],
  ['warehouseOwner', [
    'updatePkgsInfo', 
    'adjustInventory',
    'warehouseAdjustBalance' 
  ]],
  ['warehouseOrgAdmin', [
    'warehouseAdjustBalance'
  ]],
  ['sysAdmin', [
    'registrationAdvance' 
  ]]
])

const functionalityToDisplayNameMap = new Map([
  ['updatePkgsInfo', '[Update packages info]'],
  ['adjustInventory', '[Adjust inventory]'],
  ['warehouseAdjustBalance', '[Warehouse adjust balance]']
])

const roleToFunctionalityDisplayNameMap = new Map()
roleToFunctionalityMap.forEach((value, key) => {
  value.forEach(item => {
    if (!roleToFunctionalityDisplayNameMap.has(key)) {
      roleToFunctionalityDisplayNameMap.set(key, [])
    }
    roleToFunctionalityDisplayNameMap.get(key).push(functionalityToDisplayNameMap.get(item))
  })
})

const functionalityToRoleMap = reverseMap(roleToFunctionalityMap)
const authMixin = {
  methods: {
    hasAuthToFunctionality (functionality) {
      const requiredRoles = functionalityToRoleMap.get(functionality)
      const userRoles = store.getters.user.roles
      return hasIntersect(requiredRoles, userRoles)
    }
  }
}
export {
  roleToFunctionalityDisplayNameMap,
  authMixin
}
