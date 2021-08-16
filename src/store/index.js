import Vue from 'vue'
import Vuex from 'vuex'
import user from './user'
import setting from './setting'
import shared from './shared'
import warehouse from './warehouse'
import tenant from './tenant'

Vue.use(Vuex)

export const store = new Vuex.Store({
  modules: {
    user,
    setting,
    shared,
    warehouse,
    tenant
  }
})
