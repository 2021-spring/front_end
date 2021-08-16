<template>
  <v-dialog
    v-model="value" 
    scrollable 
    :max-width="maxWidth"
    :content-class="$vuetify.breakpoint.mdAndDown ? 'vitePopup smallScreenPopup' : 'vitePopup bigScreenPopup'"
    no-click-animation
    persistent
  >
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn v-if="showNavigator" small flat @click="getPreviousItem" :disabled="getPreviousItemDisabled"><v-icon large>arrow_left</v-icon>Previous</v-btn>
        <v-toolbar-title class="mx-auto">
          {{title}}
        </v-toolbar-title>
        <v-menu offset-y :close-on-content-click="false">
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon flat>
              <v-icon>settings</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-tile>
              <v-list-tile-title>ESC to close popup</v-list-tile-title>
              <v-list-tile-action>
                <v-switch v-model="isEscClose" color="info" class="ml-2"></v-switch>
              </v-list-tile-action>
            </v-list-tile>
          </v-list>
        </v-menu>
        <v-btn v-if="showNavigator" small flat @click="getNextItem" :disabled="getNextItemDisabled">Next<v-icon large>arrow_right</v-icon></v-btn>
      </v-toolbar>
      <v-card-text ref="simplePopupContainer">
        <div ref="details">
          <v-form ref="form" v-model="isValid" lazy-validation>
            <v-alert
              v-if="hasAlert"
              v-model="errorAlert"
              dismissible
              type="error">{{errorMessage}}</v-alert>
            <slot name="input"></slot>
          </v-form>
        </div>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions v-if="!hideFooter">
        <v-layout row justify-space-between>
          <v-flex class="text-xs-left" v-if="!hideLftBtn"><slot name="left_button"><v-btn color="primary" flat @click.stop="firstMethod" :disabled="isLoading">{{leftButtonText}}</v-btn></slot></v-flex>
          <v-flex class="text-xs-right" v-if="!hideRgtBtn">
              <slot name="control1"></slot>
              <slot name="right_button">    
                <LoaderButton
                  :buttonText="rightButtonText"
                  :promiseAwait="onSubmitted"
                  :disabled="!isValid || rightButtonDisabled"
                  v-model="isLoading"
                  @loaderButtonError="loaderButtonError"
                  class="ml-3"/>
              </slot>
          </v-flex>
        </v-layout>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>

import SimpleTextPopup from './SimpleTextPopup'
import LoaderButton from './LoaderButton'

export default {
  name: 'formSubmitPopup',
  components: {
    LoaderButton
  },
  extends: SimpleTextPopup,
  data () {
    return {
      isLoading: false,
      isValid: true,
      errorAlert: false,
      errorMessage: ''
    }
  },
  methods: {
    clearAlert () {
      this.errorAlert = false
      this.errorMessage = ''
    },
    validate () {
      return this.$refs.form.validate()
    },
    onSubmitted () {
      this.errorAlert = false
      if (!this.validate()) return Promise.reject(Error('Data missing.'))
      return this.secondMethod()
        .catch((error) => {
          this.loaderButtonError(error.message)
          console.error(error)
          throw error
        })
    },
    loaderButtonError (error) {
      if (this.hasAlert) {
        this.errorAlert = true
        this.errorMessage = error
      }
      this.$emit('loaderButtonError', error)
    },
    escClose (e) {
      if (this.value && this.isEscClose && e.keyCode === 27 && this.currentPopup === this.popupId && !this.isLoading) {
        this.hideMethod(0)
      }
    }
  },
  props: {
    hasAlert: {
      type: Boolean,
      default: false
    }
  }
}
</script>
