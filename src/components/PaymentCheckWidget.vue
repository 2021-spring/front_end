<template>
  <div :style="color ? `color: ${color};` : ''">
    <template v-if='editMode'>
      <v-layout justify-space-between>
        <v-flex sm4>
          <v-text-field
            id="receipient_name"
            label="Receipient Name"
            v-model="localValue.accountHolder"
            @keyup="onChange"
            :rules="[fieldIsRequired('receipient name')]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm4>
          <v-text-field
            id="phone_number"
            label="Phone Number"
            v-model="localValue.phoneNumber"
            @keyup="onChange"
            :rules="[fieldIsRequired('phone number')]"
            class="required_field"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-text-field
          id="receipient_address"
          label="Receipient Address"
          v-model="localValue.address"
          :rules="[fieldIsRequired('Receipient address')]"
          @keyup="onChange"
          class="required_field"></v-text-field>
      </v-layout>      
    </template>
    <template v-else>
      <v-layout column v-if="fullDetail">
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Recipient name:</v-flex><v-flex sm6>{{localValue.accountHolder}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Phone number:</v-flex><v-flex sm6>{{localValue.phoneNumber}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Recipient address:</v-flex><v-flex sm6>{{localValue.address}}</v-flex></v-layout></v-flex></v-layout>
      </v-layout>
      <v-layout column v-else>
        <v-flex>{{localValue.accountHolder}} * {{localValue.address}} * {{localValue.phoneNumber && (formatPhoneNumber(localValue.phoneNumber))}}</v-flex>
      </v-layout>
    </template>
  </div>
</template>

<script>
import {formatPhoneNumber, checkRules} from '../utils/tools'

export default {
  name: 'PaymentCheckWidget',
  mixins: [checkRules],
  data () {
    return {
      localValue: {}
    }
  },
  mounted () {
    this.localValue = this.value
  },
  watch: {
    value (value) {
      this.localValue = value
    }
  },
  methods: {
    onChange (event) {
      this.localValue.isValid = !!(this.localValue.accountHolder && this.localValue.phoneNumber && this.localValue.address)
      this.$emit('input', this.localValue)
    },
    formatPhoneNumber (phoneNumber) {
      return formatPhoneNumber(phoneNumber)
    }
  },
  props: {
    value: Object,
    editMode: Boolean,
    color: String,
    fullDetail: Boolean
  }
}
</script>
