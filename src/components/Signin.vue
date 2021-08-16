<template>
  <v-container class="mt-5">
    <v-layout row wrap justify-space-around v-if="error">
      <v-flex xs12 sm8 md7 lg5 xl4>
        <app-alert @dismissed="onDismissed" :text="error.message" id="signin_error"></app-alert>
      </v-flex>
    </v-layout>
    <v-layout row wrap justify-space-around>
      <v-flex xs12 sm8 md7 lg5 xl4>
        <v-card>
          <v-card-text>
            <v-container>
              <v-form v-model="valid" @submit.prevent="onFormSubmitted">
                <v-layout row wrap>
                  <v-flex xs12>
                    <v-text-field
                      prepend-icon="mail"
                      label="Email"
                      name="email"
                      id="email"
                      v-model="email"
                      type="email"
                      :disabled="userLoading"></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout row wrap>
                  <v-flex xs12>
                    <v-text-field
                      prepend-icon="lock"
                      label="Password"
                      name="password"
                      id="password"
                      v-model="password"
                      type="password"
                      :disabled="userLoading"></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout align-baseline wrap>
                    <v-flex xl4></v-flex>
                    <v-flex xs12 sm8 xl5>
                      <v-layout justify-space-between>
                        <v-flex class="text-xs-right"><a class="linkText" @click.stop="showSuggestionDialog">Contact us</a></v-flex>
                        <v-flex class="text-xs-right"><a class="linkText" @click.stop="showResetPasswordEmailDialog">Forgot password?</a></v-flex>
                      </v-layout>
                    </v-flex>
                    <v-flex class="text-xs-right">
                      <v-btn 
                          color="primary" 
                          type="submit"
                          id="submitSignin"
                          :loading="userLoading" 
                          :disabled="userLoading || !canSignin" 
                          >
                        Sign in
                      </v-btn>
                    </v-flex>
                </v-layout>
              </v-form>
            </v-container>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
    <SimpleTextPopup
      title="Please enter your email address"
      v-model="resetPasswordEmailDialog"
      :showTextbox="true"
      rightButtonText="Send email"
      @popupClose="resetPasswordEmailDialog = false"
      :rightMethod="sendResetPasswordEmail"
      small>
    </SimpleTextPopup>
    <SuggestionsPopup
      v-model="suggestionDialog"
      v-if="suggestionDialog"
      :actionMethod="SubmitSuggestion"
    >
      <template v-slot:inputText>
        <div>
          <v-flex>Please submit suggestions or questions about using the system. </v-flex>
          <br />Contact us by
          <br />QQ: 3372450933
          <br />
          <br />or
          <br />
          <br />
        </div>
      </template>
    </SuggestionsPopup>
  </v-container>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import SuggestionsPopup from './SuggestionsPopup'

export default {
  name: 'Signin',
  components: {
    SimpleTextPopup,
    SuggestionsPopup
  },
  data () {
    return {
      valid: true,
      email: '',
      password: '',
      resetPasswordEmailDialog: false,
      suggestionDialog: false
    }
  },
  computed: {
    canSignin () {
      return this.email !== '' && this.password !== ''
    },
    userLoading () {
      return this.$store.getters.userLoading
    },
    error () {
      return this.$store.getters.error
    },
    user () {
      return this.$store.getters.user
    }
  },
  watch: {
    userLoading (value) {
      if (value === false) {
        if (this.$route.query.target && this.$route.query.target !== '_') {
          let { target, ...otherParams } = this.$route.query
          this.$router.push({
            path: this.$route.query.target.replace('_', '/'),
            query: otherParams})
        } else {
          if (this.user.isAdmin) {
            this.$router.push('/administrator')
          } else {
            this.$router.push('/')
          }
        }
      }
    }
  },
  beforeMount () {
    this.$store.dispatch('clearError')
    if (this.user && this.user.uid) {
      if (this.$route.query.target && this.$route.query.target !== '_') {
        let { target, ...otherParams } = this.$route.query
        this.$router.push({
          path: this.$route.query.target.replace('_', '/'),
          query: otherParams
        })
      } else {
        this.$router.push('/')
      }
    }
  },
  methods: {
    dispatchAndToast (promise, actionText) {
      promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed. ` + error.message})
        })
    },
    showResetPasswordEmailDialog () {
      this.resetPasswordEmailDialog = true
    },
    sendResetPasswordEmail (text) {
      this.dispatchAndToast(this.$store.dispatch('sendPasswordResetEmail', text), 'Reset email has been sent')
    },
    onFormSubmitted () {
      this.$store.dispatch('signUserIn', {email: this.email, password: this.password})
    },
    onDismissed () {
      this.$store.dispatch('clearError')
    },
    showSuggestionDialog () {
      this.suggestionDialog = true
    },
    SubmitSuggestion (payload) {
      this.$store.dispatch('sendSuggestion', payload)
    }
  }
}
</script>

<style>
.linkText:hover {
  text-decoration: underline;
}

.thinBox .v-input__slot {
  border: 1px solid rgba(0,0,0,.54) !important;
}
</style>
