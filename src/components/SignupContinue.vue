<template>
  <v-container class="mt-5">
    <v-layout row wrap v-if="error" justify-space-around>
      <v-flex xs12 sm6 lg5>
        <app-alert @dismissed="onDismissed" :text="error.message"></app-alert>
      </v-flex>
    </v-layout>
    <v-layout row wrap justify-space-around>
      <v-flex xs12 sm6 lg5>
        <v-card>
          <v-card-text>
            <v-layout row wrap>
              <v-flex>
                <v-text-field
                  prepend-icon="mail"
                  label="Email"
                  v-model="email"
                  ></v-text-field>
              </v-flex>
            </v-layout>
            <v-form ref="form" v-model="isValid" lazy-validation>
              <v-layout row wrap justify-space-between>
                <v-flex md5>
                  <v-autocomplete
                    prepend-icon="explore"
                    label="Role"
                    :items="roles"
                    item-text="name"
                    item-value="id"
                    v-model="role"
                    :rules="[rules.checkNullStr]"
                    clearable
                    class="required_field"></v-autocomplete>
                </v-flex>
              </v-layout>
              <v-layout row wrap>
                <v-flex>
                  <v-text-field
                    prepend-icon="person"
                    label="Name or ID"
                    v-model="name"
                    ref="name"
                    :error-messages="errorMsg"
                    :error="!isNameAvailable"
                    :rules="[rules.checkNullStr]"
                    class="required_field"></v-text-field>
                </v-flex>
              </v-layout>
              <v-layout row wrap>
                <v-flex xs12>
                  <v-text-field
                    prepend-icon="lock"
                    label="Password"
                    type="password"
                    v-model="password"
                    :rules="[rules.checkNullStr, rules.checkPasswordLength]"
                    class="required_field"></v-text-field>
                </v-flex>
              </v-layout>
              <v-layout row wrap>
                <v-flex xs12>
                  <v-text-field
                    prepend-icon="lock"
                    label="Confirm password"
                    type="password"
                    v-model="confirmPwd"
                    :rules="[rules.checkNullStr, rules.checkConfirmPwd, rules.checkPasswordLength]"
                    class="required_field"></v-text-field>
                </v-flex>
              </v-layout>
              <v-layout align-baseline justify-space-between>
                <v-btn @click="clear">Clear</v-btn>
                <LoaderButton
                  :buttonText="'Confirm'"
                  :promiseAwait="onFormSubmitted"
                  ></LoaderButton>
              </v-layout>                  
            </v-form>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import LoaderButton from './LoaderButton'

export default {
  name: 'Signup',
  components: {
    LoaderButton
  },
  data () {
    return {
      isValid: false,
      roles: [
        {
          id: '0',
          name: 'Organization'
        },
        {
          id: '1',
          name: 'Individual'
        },
        {
          id: '2',
          name: 'Warehouse'
        }
      ],
      role: null,
      referralNum: null,
      name: null,
      isNameAvailable: true,
      timeoutId: null,
      email: null,
      errorMsg: [],
      password: null,
      confirmPwd: null,
      rules: {
        checkNullStr: (value) => {
          return !value || value.length === 0 ? 'This field is required' : true
        },
        checkPasswordLength: (value) => {
          return !value || value.length < 8 ? 'Password should be at least 8 charactors' : true
        },
        checkConfirmPwd: (value) => {
          return !value || value !== this.password ? 'Confirmed password does not match' : true
        }
      }
    }
  },
  computed: {
    user () {
      return this.$store.getters.user
    },
    error () {
      return this.$store.getters.error
    }
  },
  mounted () {
    const url = new URL(location.href)
    this.email = url.searchParams.get('email') || ''
  },
  watch: {
    user (value) {
      if (value !== null && value !== undefined) {
        this.$router.push('/')
      }
    },
    name (value) {
      this.isNameAvailable = false
      clearTimeout(this.timeoutId)
      this.timeoutId = setTimeout(() => {
        this.$store.dispatch('checkNameAvailable', value.trim())
          .then(rtn => {
            if (rtn) {
              this.isNameAvailable = true
              this.errorMsg = []
            } else {
              this.errorMsg = 'This name has been used'
            }
          })
      }, 500)
    }
  },
  methods: {
    onFormSubmitted () {
      if (this.$refs.form.validate() && this.isNameAvailable) {
        let payload = {
          name: this.name.trim(),
          password: this.password,
          role: parseInt(this.role),
          email: this.email
        }
        return this.$store.dispatch('finishEmailSignup', payload)
      }
    },
    clear () {
      this.$refs.form.reset()
    },
    onDismissed () {
      this.$store.dispatch('clearError')
    }
  }
}
</script>
