<template>
  <v-dialog 
    v-model="value" 
    scrollable 
    :max-width="maxWidth"
    :content-class="$vuetify.breakpoint.mdAndDown ? 'vitePopup smallScreenPopup' : ''"
    persistent 
    no-click-animation
    v-scroll:#scrollContainer="onScroll"
  >
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn v-if="showNavigator" flat @click="getPreviousItem" :disabled="getPreviousItemDisabled"><v-icon large>arrow_left</v-icon>Previous</v-btn>
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
        <v-btn v-if="showNavigator" flat @click="getNextItem" :disabled="getNextItemDisabled">Next<v-icon large>arrow_right</v-icon></v-btn>
      </v-toolbar>
      <v-card-text v-if="!$slots.input">
        <v-textarea v-if="showMultilineTextbox"
          name="input-3"
          :label="label"
          v-model="text"
          outline
          ref="thepopup"></v-textarea>
        <v-text-field v-else
          name="input-3"
          :label="label"
          v-model="text"
          @keyup.enter="secondMethod(text)"
          ref="thepopup"
        ></v-text-field>
      </v-card-text>
      <v-card-text v-else ref="simplePopupContainer" id="scrollContainer">
        <div ref="details"><slot name="input"></slot></div>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions v-if="!hideFooter">
        <slot name="popupAction">
          <v-layout row justify-space-between>
            <v-flex class="text-xs-left" v-if="!hideLftBtn">
              <slot name="left_button">
                <v-btn color="primary" flat @click.stop="firstMethod">{{leftButtonText}}</v-btn>
              </slot>
            </v-flex>
            <v-flex class="text-xs-right" v-if="!hideRgtBtn">
              <slot name="right_button">
                <v-btn color="primary" flat @click.stop="secondMethod" :disabled="rightButtonDisabled" :id="rightButtonText">{{rightButtonText}}</v-btn>
              </slot>
            </v-flex>
          </v-layout>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { getRandomIdByTime } from '../utils/tools'

export default {
  name: 'simplePopup',
  data () {
    return {
      text: '',
      isEscClose: true,
      popupId: 0
      
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.text = this.theText
        this.registerPopup()
      } else {
        this.unRegisterPopup()
      }
    },
    isEscClose (value) {
      this.$store.commit('setlocalSettings', {name: 'isEscClose', value: value})
    }
  },
  mounted () {
    this.popupId = getRandomIdByTime(3)
    this.scrollToBottom && this.scrollBottom()
    this.isEscClose = this.$store.getters.localSettings.isEscClose
    this.registerPopup()
  },
  beforeDestroy () {
    this.unRegisterPopup()
  },
  updated () {
    if (this.value && this.showTextbox) {
      this.$nextTick(() => { if (this.$refs.thepopup) this.$refs.thepopup.focus() })
    }
  },
  computed: {
    maxWidth () {
      return this.large ? '95%' : (this.medium ? '60%' : (this.small ? '30%' : '550px'))
    },
    currentPopup () {
      return this.$store.getters.popupStack.slice(-1)[0]
    }
  },
  methods: {
    registerPopup () {
      if (this.popupId && this.currentPopup !== this.popupId) {
        this.addEscListener()
        this.$store.commit('registerPopup', this.popupId)
      }
    },
    unRegisterPopup () {
      this.removeEscListener()
      this.$store.commit('unRegisterPopup', this.popupId)
    },
    onScroll (e) {
      if (this.outsideScrollToBottom) {
        let eHeight = e.target.clientHeight
        let eScrollTop = document.getElementById('scrollContainer') && document.getElementById('scrollContainer').scrollTop
        let eScrollHeight = document.getElementById('scrollContainer') && document.getElementById('scrollContainer').scrollHeight

        if (Math.abs(eHeight + eScrollTop - eScrollHeight) <= 2) {
          this.outsideScrollToBottom(true)
        } else {
          this.outsideScrollToBottom(false)
        }
      }
    },
    scrollBottom () {
      setTimeout(() => { 
        this.$nextTick(() => { 
          this.$refs.simplePopupContainer && (this.$refs.simplePopupContainer.scrollTop = this.$refs.details.offsetHeight)
        })
      }, 300)
    },
    scrollTop () {
      setTimeout(() => { 
        this.$nextTick(() => { 
          this.$refs.simplePopupContainer && (this.$refs.simplePopupContainer.scrollTop = 0)
        })
      }, 300)
    },
    firstMethod () {
      if (this.leftMethod) {
        this.leftMethod(this.text, this.extraData)
      }
      this.hideMethod(0)
    },
    secondMethod () {
      if (this.rightMethod) {
        const rtn = this.$slots.input ? this.rightMethod(this.extraData) : this.rightMethod(this.text, this.extraData)
        if (rtn && rtn.then) {
          return rtn
            .then((rtn) => {
              if (rtn === 'keepPopup') return
              this.hideMethod(1)
            })
        }
        if (rtn !== 'keepPopup') this.hideMethod(1)
        return Promise.resolve()
      }
    },
    hideMethod (rtn) {
      this.$emit('popupClose', rtn)
    },
    escClose (e) {
      if (this.value && this.isEscClose && e.keyCode === 27 && this.currentPopup === this.popupId) {
        this.hideMethod(0)
      }
    },
    addEscListener () {
      document.addEventListener('keydown', this.escClose)
    },
    removeEscListener () {
      document.removeEventListener('keydown', this.escClose)
    },
    getPreviousItem () {
      this.$emit('getPreviousItem')
    },
    getNextItem () {
      this.$emit('getNextItem')
    }
  },
  props: {
    value: Boolean,
    showMultilineTextbox: {
      type: Boolean,
      default: false
    },
    theText: {
      type: String,
      default: ''
    },
    extraData: {
      type: Object,
      default: function () {
        return {}
      }
    },
    hideLftBtn: {
      type: Boolean,
      default: false
    },
    hideRgtBtn: {
      type: Boolean,
      default: false
    },
    large: {
      type: Boolean,
      default: false
    },
    medium: {
      type: Boolean,
      default: false
    },
    small: {
      type: Boolean,
      default: true
    },
    title: String,
    label: String,
    leftButtonText: {
      type: String,
      default: 'Close'
    },
    rightButtonText: {
      type: String,
      default: 'Save'
    },
    rightMethod: Function,
    leftMethod: Function,
    rightButtonDisabled: Boolean,
    flag: [String, Array],
    scrollToBottom: Boolean,
    outsideScrollToBottom: Function,
    showNavigator: {
      type: Boolean,
      default: false
    },
    getNextItemDisabled: Boolean,
    getPreviousItemDisabled: Boolean,
    hideFooter: Boolean
  }
}
</script>

<style>
.vitePopup.smallScreenPopup {
  margin-top: -20px !important;
  max-height: 80% !important;
}
</style>
