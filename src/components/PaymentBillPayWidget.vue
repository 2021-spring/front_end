<template>
  <div :style="color ? `color: ${color};` : ''">
    <template v-if='editMode'>
      <v-layout justify-space-between>
        <v-flex sm4>
          <v-text-field
            id="bank_name"
            label="Credit card company"
            v-model="localValue.creditCardCompany"
            hint="E.g. Chase, Bank of America, Wells Fargo, Citibank, PNC, etc."
            :rules="[fieldIsRequired('bank name')]"
            class="required_field"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex sm4>
          <v-text-field
            id="account_holder"
            label="Card holder name"
            v-model="localValue.accountHolder"
            :rules="[fieldIsRequired('holder name')]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm4>
          <v-text-field
            id="account_number"
            label="Account number"
            :rules="[fieldIsRequired('account number')]"
            v-model="localValue.accountNumber"
            class="required_field"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-text-field
          id="account_address"
          label="Bank PO box"
          :rules="[fieldIsRequired('bank address')]"
          v-model="localValue.address"
          class="required_field"></v-text-field>
      </v-layout>
    </template>
    <template v-else>
      <v-layout column v-if="fullDetail">
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Credit Card Company:</v-flex><v-flex sm6>{{localValue.creditCardCompany}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Card Holder Name:</v-flex><v-flex sm6>{{localValue.accountHolder}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Account Number:</v-flex><v-flex sm6>{{localValue.accountNumber}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Bank PO box:</v-flex><v-flex sm6>{{localValue.address}}</v-flex></v-layout></v-flex></v-layout>
      </v-layout>
      <v-layout column v-else>
        <v-flex>{{localValue.creditCardCompany}} * {{localValue.accountHolder}} * {{localValue.accountNumber}} * {{localValue.address}}</v-flex>
      </v-layout>
    </template>
  </div>
</template>

<script>
import { checkRules } from '@/utils/tools'

export default {
  name: 'PaymentBillPayWidget',
  mixins: [checkRules],
  data () {
    return {
      cardNetworks: ['Visa', 'MasterCard', 'American Express'],
      localValue: {}
    }
  },
  mounted () {
    this.localValue = this.value
  },
  watch: {
    localValue: {
      handler: function (newValue) {
        this.localValue.isValid = !!(this.localValue.creditCardCompany && this.localValue.accountHolder && this.localValue.accountNumber && this.localValue.address)
        this.$emit('input', this.localValue)
      },
      deep: true
    },
    value (value) {
      this.localValue = value
    }
 
  },
  methods: {
  },
  props: {
    value: Object,
    editMode: Boolean,
    color: String,
    fullDetail: Boolean
  }
}
</script>
