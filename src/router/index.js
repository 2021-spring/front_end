import Vue from 'vue'
import Router from 'vue-router'
import routes from './routeDefinition'
import AuthGuard from './auth-guard'
import DefaultRoute from './default-route'

Vue.use(Router)
const router = new Router({
  mode: 'history',
  routes: Object.values(routes)
})

router.beforeEach(AuthGuard)
router.beforeEach(DefaultRoute)

export default router
