// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import AlertCmp from '@/components/Alert.vue'
import ViteAutocomplete from '@/components/ViteAutocomplete'
import router from './router'
import { store } from './store'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import {Logger} from '@/utils/tools'
import linkify from 'vue-linkify'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import 'firebase/compat/functions'
import 'firebase/compat/auth'
import {authMixin} from './router/functionalityAuth'

Vue.use(Vuetify, {
  theme: {
    primary: '#224855',
    secondary: '#424242',
    accent: '#82B1FF',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107'
  }
})
Vue.directive('linkified', linkify)
Vue.config.productionTip = false

Vue.component('App', App)
Vue.component('app-alert', AlertCmp)
Vue.component('vite-autocomplete', ViteAutocomplete)
Vue.mixin(authMixin)
/* eslint-disable no-new */
// eslint-disable-next-line
var vm = new Vue({
  el: '#app',
  router,
  store,
  template: '<App/>',
  beforeCreate () {
    firebase.initializeApp(process.env.firebaseConfig)
    firebase.firestore().useEmulator('http://localhost', 8088)
    firebase.functions().useEmulator('http://localhost', 5001)
    firebase.auth().useEmulator('http://localhost', 9099)
    console.log('')
    Logger.initialize(this.$store)
    this.$store.commit('setVersion', process.env.version)
    this.$store.commit('setEnvironment', process.env.NODE_ENV)
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        return this.$store.dispatch('initializeApp', user)
          .then(() => {
            return this.$store.dispatch('loadUser', user)
          })
      }
    })
  }
})
