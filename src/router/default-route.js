import {store} from '../store'
import routes from '@/router/routeDefinition'

export default (to, from, next) => {
  if (to.path === '/') {
    let roles = store.getters.user.roles || []
    let firstRoute = Object.values(routes).find(route => {
      let routeAuth = (route.meta && route.meta.auth) || []
      return (routeAuth.length === 0 || roles.some(role => routeAuth.includes(role))) 
    })
    next(firstRoute.path)
  }
  next()
}
