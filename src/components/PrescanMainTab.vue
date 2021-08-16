<template>
  <div>
    <v-layout align-baseline justify-space-between>
      <v-flex xs4 md2>
        <v-switch
          :label="isInbound ? 'Inbound' : 'Outbound'"
          v-model="isInbound"
        ></v-switch>
      </v-flex>
      <v-flex xs4 md2>
        <v-switch
          label="Sound"
          v-model="soundToggle"
          @change="setSoundToggle"
        ></v-switch>
      </v-flex>
      <v-flex>
        Total: <v-btn dark large color="blue" title="Total" style="font-size: 42px!important;">
            {{ trackings.length }}
          </v-btn>
      </v-flex>

      <v-flex xs4 class="text-xs-right">
        <v-btn dark color="red" @click="clearAllTrackings">
          <v-icon dark left>delete</v-icon>
          Clear
        </v-btn>
        <LoaderButton
          buttonText="Submit"
          :promiseAwait="uploadScannedTrackings"/>
      </v-flex>
    </v-layout>
    <v-layout align-baseline justify-space-between>
      <v-flex xs6>
        <v-radio-group
          :column="false"
          v-model="carrier">
          <v-radio
            v-for="item in Object.entries(carrierMap)"
            :key="item[0]"
            :label="`${item[1]}`"
            :value="item[0]"
          ></v-radio>
        </v-radio-group>
      </v-flex>
      <v-divider vertical style="margin: 12px 0px; border-width: 1px"></v-divider>
      <v-flex xs4>
        <v-radio-group
          :column="false"
          v-model="serviceType">
          <v-radio
            v-for="item in Object.entries(serviceTypeMap)"
            :key="item[0]"
            :label="`${item[1]}`"
            :value="item[0]"
          ></v-radio>
        </v-radio-group>
      </v-flex>
    </v-layout>
    <v-layout>
      <v-flex xs6>
        <v-text-field
          :label="'Input Tracking here' + (forceMode ? `(force ${forceMode} mode)` : '')"
          hint="Alt+t / [*] to add as tracking"
          v-model="barcode"
          @keyup.enter="addBarcode"
          @keyup.alt.84="forceAddTracking"
          :outline="!!forceMode"
          autofocus></v-text-field>
      </v-flex>
    </v-layout>
    <v-layout wrap>
      <v-flex xs4 v-for="item in trackings" :key="item">
        <v-chip
          close
          @input="onDeleteChip(item)">{{item}}</v-chip>
      </v-flex>
    </v-layout>
    <v-layout mt-3>
      <v-flex>
        <v-textarea
          outline
          class="thinBox"
          label="Note"
          rows="2"
          v-model="note"></v-textarea>
      </v-flex>
    </v-layout>
    <v-layout>
      <UploadFileWidget
        v-model="uploadedFiles"
        ref="fileUploader"
        type="comments"
        :maxFiles="10"/>
    </v-layout>
  </div>
</template>

<script>
import LoaderButton from './LoaderButton'
import UploadFileWidget from './UploadFileWidget'
import {mediaTools, timeTools, splitKeyword, warehouseTools, stringTools} from '@/utils/tools'

export default {
  name: 'PrescanMainTab',
  components: {
    LoaderButton,
    UploadFileWidget
  },
  mixins: [
    mediaTools, timeTools, warehouseTools, stringTools
  ],
  data () {
    return {
      trackings: [],
      uploadedFiles: [],
      clearFilesFlag: false,
      soundToggle: false,
      soundPitch: 1,
      isInbound: true,
      carrier: 'usps',
      serviceType: 'all',
      note: '',
      barcode: '',
      forceMode: ''
    }
  },
  created () {
    this.soundToggle = window.localStorage.getItem('inbound.soundToggle')
    this.soundToggle = (this.soundToggle !== undefined && this.soundToggle === 'true') || false
    this.soundPitch = Number(window.localStorage.getItem('inbound.soundPitch') || 1)
    this.trackings = JSON.parse(window.localStorage.getItem('trackings') || '[]')
  },
  destroyed () {
    this.sound = {}
    this.closeSound()
  },
  methods: {
    setSoundToggle (value) {
      localStorage.setItem('inbound.soundToggle', value)
      if (!value) {
        this.closeSound()
      }
    },
    uploadScannedTrackings () {
      if (!this.trackings.length) return this.$store.dispatch('showToast', {info: `Empty tracking.`, level: 'error'})
      return this.$store.dispatch('uploadScannedTrackings', {
        trackings: this.trackings, 
        type: this.isInbound ? 'inbound' : 'outbound',
        carrier: this.carrier,
        uploadedFiles: this.uploadedFiles,
        serviceType: this.serviceType,
        note: this.note
      })
        .then(() => {
          this.$store.dispatch('showToast', {info: `Upload success.`, level: 'success'})
          window.localStorage.removeItem('trackings')
          this.trackings = []
          this.$refs.fileUploader.$$cleanData()
          this.carrier = 'usps'
          this.serviceType = 'all'
          this.note = ''
        })
    },
    playSound (type) {
      if (!this.soundToggle) return
      if (type === 'hint') return this.hintSound(this.soundPitch)()
      if (type === 'success') return this.successSound(this.soundPitch)()
      if (type === 'warning') return this.warningSound(this.soundPitch)()
      return this.closeSound()
    },
    splitKeyword,
    onDeleteChip (value) {
      if (!confirm(`Are you sure to delete tracking ${value}?`)) return
      this.trackings = this.trackings.filter(item => item !== value)
      window.localStorage.setItem('trackings', JSON.stringify(this.trackings))
    },
    clearAllTrackings () {
      if (!confirm(`Are you sure to clear all trackings?`)) return
      this.trackings = []
      window.localStorage.setItem('trackings', JSON.stringify(this.trackings))
    },
    addBarcode (event) {
      if (this.handleSpecialBarcode()) return
      // if (BarcodeFinder.isUpcValid(this.barcode) && carrierMaybe.length > 0) {
      //   this.pickBarcodedialog = true
      //   return
      // }
      
      if (this.forceMode === 'tracking') {
        this.forceAddTracking(event)
        return
      }
      const barcode = this.trimNonwordChar(event.target.value)

      let carrierMaybe = this.guessCarrier(barcode)
      if (carrierMaybe.length > 0) {
        this.addTracking(carrierMaybe[0].tracking[0].toUpperCase())
      } else {
        this.showToast(event, 'invalid tracking number')
      }
    },
    showToast (event, info) {
      this.playSound('warning')
      event && event.target.select()
      this.$store.dispatch('showToast', {info})
    },
    addTracking (tracking) {
      if (!tracking) return
      this.trackings = [...new Set([...this.trackings, tracking])]
      this.barcode = ''
      window.localStorage.setItem('trackings', JSON.stringify(this.trackings))
      this.playSound('success')
    },
    forceAddTracking (event) {
      const barcode = this.trimNonwordChar(event.target.value)
      if (!barcode) this.showToast(event, 'Please scan a valid tracking number first')
      this.addTracking(barcode.toUpperCase())
    },
    handleSpecialBarcode () {
      if (['*t*', '*tracking*'].includes(this.barcode.toLowerCase())) {
        this.forceMode = 'tracking'
        this.barcode = ''
        this.playSound('success')
        return true
      }
      if (['**'].includes(this.barcode.toLowerCase())) {
        this.forceMode = ''
        this.barcode = ''
        this.playSound('success')
        return true
      }

      return false
    }
  },
  props: {
    carrierMap: Object,
    serviceTypeMap: Object
  }
}
</script>
