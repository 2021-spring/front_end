import {store} from '../store'

export default (to, from, next) => {
  if (store.getters.user) {
    let roles = store.getters.user.roles || []
    let routeAuth = to.matched[0].meta.auth || []
    let toBetaFeature = to.matched[0].meta.betaFeature
    const userBetaFeatures = store.getters.betaFeatures || []
    // console.log('[router] user roles: ', roles)
    if (
      (routeAuth.length > 0 && 
      (!roles.includes('sysAdmin') && 
      !roles.some(role => routeAuth.includes(role)))) // true: user has no access right
      || 
      (toBetaFeature && !userBetaFeatures.includes(toBetaFeature)) // true: beta feature is disabled
    ) {
      // alert('You are not allowed to visit this page')
      next('/')
      return
    }

    if (store.getters.user.isAdmin) {
      next()
      return
    }
    if (to.path === '/prescan' && !store.getters.activatePrescan) {
      next('/')
      return
    }
    next()
  } else {
    if (['/signin', '/signup', '/signupContinue'].some(element => element === to.path)) {
      next()
    } else {
      next({
        path: '/signin',
        query: {
          target: to.path.replace('/', '_'),
          ...to.query
        }
      })
    }
  }
}
