<template>
  <FormSubmitPopup
    title="Edit SN"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Confirm"
    large
  >
    <template v-slot:input>
      <v-container>
        <v-combobox
          v-model="snArrayInEdit"
          chips
          multiple
          deletable-chips
          prepend-icon="filter_list"
          :suffix="snArrayInEdit.length.toString()"
          @change="onSnChanged"
          clearable></v-combobox>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {cloneDeep, mediaTools} from '../utils/tools'

export default {
  name: 'SnArrayEditPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [mediaTools],
  data () {
    return {
      snArrayInEdit: [],
      soundToggle: true,
      soundPitch: 1,
      soundSettings: {
        success: () => {},
        hint: () => {},
        warning: () => {},
        tracking: () => {},
        upc: () => {}
      }
    }
  },
  mounted () {
    if (this.snArray) {
      this.snArrayInEdit = cloneDeep(this.snArray)
    }
    this.soundToggle = window.localStorage.getItem('inbound.soundToggle')
    this.soundToggle = (this.soundToggle !== undefined && this.soundToggle === 'true') || false
    this.soundPitch = Number(window.localStorage.getItem('inbound.soundPitch') || 1)
    this.onSoundPitchChanged()
  },
  methods: {
    async onSubmitted () {
      const {snArrayInEdit} = this
      this.$emit('submitted', [...new Set(snArrayInEdit.map(item => item.toUpperCase()))])
    },
    playSound (type = 'hint') {
      if (this.soundToggle) this.soundSettings[type]()
    },
    onSoundPitchChanged (value = true) {
      this.soundSettings.hint = value ? this.hintSound(this.soundPitch) : () => {}
      this.soundSettings.success = value ? this.successSound(this.soundPitch) : () => {}
      this.soundSettings.warning = value ? this.warningSound(this.soundPitch) : () => {}
      this.soundSettings.upc = value ? this.upcSound(this.soundPitch) : () => {}
      this.soundSettings.tracking = value ? this.trackingSound(this.soundPitch) : () => {}
      return value || this.closeSound()
    },
    onSnChanged () {
      this.playSound('success')
    }
  },
  props: {
    value: Boolean,
    snArray: Array
  }
}
</script>
