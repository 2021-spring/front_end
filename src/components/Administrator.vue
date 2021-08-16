<template>
  <v-container fluid>
    <v-layout>
      <v-btn flat color="primary" title="Refresh" @click="getAllCodes">
          <v-icon dark class="mx-2">refresh</v-icon>
            Refresh
      </v-btn>
      <v-btn flat color="primary" title="Add registration code" @click="addCode('tenant')" v-if="hasAuthToFunctionality('registrationAdvance')">
          <v-icon dark class="mx-2">add</v-icon>
            Tenant Registration code
      </v-btn>
      <v-btn flat color="primary" title="Add registration code" @click="addCode('warehouse')" v-if="hasAuthToFunctionality('registrationAdvance')">
          <v-icon dark class="mx-2">add</v-icon>
            Warehouse Registration code
      </v-btn>
      <v-spacer></v-spacer>
      <v-flex md4 v-if="hasAuthToFunctionality('registrationAdvance')">
        <v-layout>
          <v-flex md4>
            <v-text-field
              label="key"
              name="key"
              id="key"
              v-model="key"></v-text-field>
          </v-flex>
          <v-spacer></v-spacer>
          <v-flex md4>
            <v-text-field
              label="Email"
              name="email"
              id="email"
              v-model="email"></v-text-field>
          </v-flex>
          <v-btn flat color="primary" title="Register" @click="registerUser">
              Register User
          </v-btn>
        </v-layout>
      </v-flex>
    </v-layout>
    <v-layout justify-start>
      <v-flex :style="{ whiteSpace: 'pre-wrap' }">Status:       {{status}}</v-flex>
    </v-layout>
    <v-layout>
      <v-progress-linear :indeterminate="loading"></v-progress-linear>
    </v-layout>
    <br>
    <v-flex sm8 md5>
      <v-layout justify-space-between>
        <v-flex sm4 class="font-weight-bold text-sm-left">Registration Code</v-flex>
        <v-flex sm4 class="font-weight-bold text-sm-left">Registration Type</v-flex>
        <v-flex sm4 class="font-weight-bold text-sm-left">Created Time</v-flex>
      </v-layout>
    </v-flex>
    <v-layout v-for="item in codes" column :key="item.code">
      <v-layout justify-start>
        <v-flex sm8 md5>
          <v-layout>
            <v-flex sm4 class="text-sm-left">{{item.code}}</v-flex>
            <v-flex sm4 class="text-sm-left">{{item.type || ''}}</v-flex>
            <v-flex sm4 class="text-sm-left">{{toTimestampString(item.createTime)}}</v-flex>
          </v-layout>
        </v-flex>
      </v-layout>
      <v-spacer></v-spacer>
    </v-layout>
  </v-container>
</template>

<script>
import { toTimestampString, convertTimestampToDateInObj } from '@/utils/tools'

export default {
  name: 'Administrator',
  data () {
    return {
      loading: false,
      error: '',
      codes: [],
      key: '',
      email: ''
    }
  },
  computed: {
    users () {
      return this.$store.getters.users
    },
    status () {
      return this.loading ? 'Processing...' : (this.error || 'Finished')
    },
    processEnv () {
      return process.env.NODE_ENV
    }
  },
  methods: {
    toTimestampString: toTimestampString,
    async registerUser () {
      if (this.$store.getters.user.isAdmin && this.key && this.email) {
        let payload = {user: this.$store.getters.user, uid: this.key, email: this.email}
        delete payload.user.isAdmin
        await this.$store.dispatch('reset_state')
        await this.$store.dispatch('loadUser', payload)
      }
    },
    runProcess (promise) {
      this.loading = true
      this.error = ''
      return Promise.resolve(promise)
        .then(() => {
          this.loading = false
        })
        .catch(error => {
          this.error = error.message
          this.loading = false
          console.error(error)
        })
    },
    getAllCodes () {
      this.loading = true
      return this.runProcess(this.$store.dispatch('getAllRegistrationCode')
        .then(docs => {
          this.codes = docs.docs.map(doc => {
            let code = convertTimestampToDateInObj(doc.data())
            return code
          })
        }))
    },
    addCode (type = 'tenant') {
      return this.runProcess(this.$store.dispatch('addRegistrationCode', {type})
        .then(code => this.codes.push(code)))
    }
  }
}
</script>
