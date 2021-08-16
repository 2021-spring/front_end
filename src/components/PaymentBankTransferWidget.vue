<template>
  <div :style="color ? `color: ${color};` : ''">
    <template v-if='editMode'>
      <v-layout>
        <v-text-field
          id="bank_name"
          label="Bank name"
          v-model="localValue.bankName"
          :rules="[fieldIsRequired('bank name')]"
          hint="E.g. Chase, Bank of America, Wells Fargo, Citibank, PNC"
          @keyup="onChange"
          class="required_field"></v-text-field>
      </v-layout>
      <v-layout align-baseline justify-space-between>
      </v-layout>
      <v-layout justify-space-between="">
        <v-flex sm4>
          <v-text-field
            id="account_holder"
            label="Account holder name"
            v-model="localValue.accountHolder"
            @keyup="onChange"
            :rules="[fieldIsRequired('holder name')]"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm4>
          <v-select
            :items="currencies"
            v-model="localValue.currency"
            :rules="[fieldIsRequired('currency')]"
            label="Currency"
            class="required_field"></v-select>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex sm4>
          <v-text-field
            id="routing_number"
            label="Routing number"
            v-model="localValue.routingNumber"
            @keyup="onChange"
            class="required_field"></v-text-field>
        </v-flex>
        <v-flex sm4>
          <v-text-field
            id="account_number"
            label="Account number"
            v-model="localValue.accountNumber"
            @keyup="onChange"
            :rules="[fieldIsRequired('account number')]"
            class="required_field"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-text-field
          id="account_address"
          label="Bank address"
          v-model="localValue.address"
          @keyup="onChange"
          :rules="[fieldIsRequired('account address')]"
          class="required_field"></v-text-field>
      </v-layout>
      <v-layout>
        <v-text-field
          id="billing_address"
          label="Billing address"
          v-model="localValue.billingAddress"
          @keyup="onChange"
          :rules="[fieldIsRequired('billing address')]"
          class="required_field"></v-text-field>
      </v-layout>
    </template>
    <template v-else>
      <v-layout column v-if="fullDetail">
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Bank Name:</v-flex><v-flex sm6>{{localValue.bankName}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Currency:</v-flex><v-flex sm6>{{localValue.currency}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Account Holder:</v-flex><v-flex sm6>{{localValue.accountHolder}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Routing Number:</v-flex><v-flex sm6>{{localValue.routingNumber}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Account:</v-flex><v-flex sm6>{{localValue.accountNumber}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Bank Address:</v-flex><v-flex sm6>{{localValue.address}}</v-flex></v-layout></v-flex></v-layout>
        <v-layout><v-flex sm6 md4><v-layout><v-flex sm6>Billing Address:</v-flex><v-flex sm6>{{localValue.billingAddress}}</v-flex></v-layout></v-flex></v-layout>
      </v-layout>
      <v-layout column v-else>
        <v-flex>{{localValue.bankName}} * {{localValue.currency}} * {{localValue.accountHolder}} * {{localValue.routingNumber}} * {{localValue.accountNumber && localValue.accountNumber.replace(/(.{4})/g,'$1 ')}} * {{localValue.address}}</v-flex>
      </v-layout>
    </template>
  </div>
</template>

<script>
import { checkRules } from '@/utils/tools'

export default {
  name: 'PaymentBankTransferWidget',
  mixins: [checkRules],
  data () {
    return {
      currencies: ['USD', 'RMB'],
      localValue: {}
    }
  },
  mounted () {
    this.localValue = this.value
    if (this.editMode && !this.localValue.currency) {
      this.$set(this.localValue, 'currency', this.currencies[0])
    }
  },
  watch: {
    value (value) {
      if (!value.currency) value.currency = this.currencies[0]
      this.localValue = value
    }
  },
  methods: {
    onChange (event) {
      this.localValue.isValid = !!(this.localValue.bankName && this.localValue.currency && this.localValue.accountHolder && this.localValue.routingNumber && this.localValue.accountNumber && this.localValue.address)
      this.$emit('input', this.localValue)
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
