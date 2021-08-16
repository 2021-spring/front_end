<template>
  <v-container class="mt-5">
    <v-layout row wrap justify-space-around v-if="error">
      <v-flex xs12 sm6 lg4>
        <app-alert @dismissed="onDismissed" :text="error.message"></app-alert>
      </v-flex>
    </v-layout>
    <v-layout row wrap justify-space-around>
      <v-flex xs12 sm6 lg4>
        <v-alert
          v-model="successAlert"
          dismissible
          type="success">You will receive a confirmation email. Please click the link to finish signup process using the same device..</v-alert>
        <v-alert
          v-model="errorAlert"
          dismissible
          type="error">{{errorMessage}}</v-alert>
        <v-card>
          <v-card-text>
            <v-form ref="form" v-model="isValid" lazy-validation>
              <v-layout>
                <v-text-field
                  prepend-icon="mail"
                  label="Login email"
                  name="email"
                  id="email"
                  v-model="email"
                  type="email"
                  :rules="[fieldIsEmail(), fieldIsRequired('email')]"
                  @keyup.enter="onFormSubmitted"
                  class="required_field"></v-text-field>
              </v-layout>
              <v-layout align-center justify-end>
                <a @click.stop="showResetPasswordEmailDialog">Forget your password?</a>
                <LoaderButton
                  :buttonText="'Send'"
                  :promiseAwait="onFormSubmitted"
                  :disabled="!isValid || btnLoading"
                  :loading="btnLoading"></LoaderButton>
              </v-layout>
            </v-form>
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
      small/>
  </v-container>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import LoaderButton from './LoaderButton'
import { checkRules } from '@/utils/tools'

export default {
  name: 'Signup',
  components: {
    SimpleTextPopup,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      referral: '',
      email: '',
      resetPasswordEmailDialog: false,
      errorAlert: false,
      successAlert: false,
      errorMessage: '',
      isValid: true
    }
  },
  computed: {
    error () {
      return this.$store.getters.error
    }
  },
  beforeMount () {
    this.$store.dispatch('clearError')
  },
  methods: {
    onFormSubmitted () {
      if (!this.$refs.form.validate()) return Promise.reject(Error('Form validate failed.'))
      return this.$store.dispatch('checkEmailAvailable', this.email)
        .then(rtn => {
          if (rtn) {
            this.errorAlert = false
            this.successAlert = true
            return this.$store.dispatch('sendEmailVerification', this.email)
              .then(() => { this.successAlert = true })
          }
          return Promise.reject(new Error('duplicate-email'))
        })
        .catch(error => {
          this.successAlert = false
          this.errorAlert = true
          if (error.message === 'duplicate-email') {
            this.errorMessage = 'Email already exists'
          } else {
            this.errorMessage = 'Network issue. Send email failed'
          }          
          console.log(error.message)
          return Promise.reject(new Error(this.errorMessage))
        })
    },
    onDismissed () {
      this.$store.dispatch('clearError')
    },
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
    }
  }
}
</script>
