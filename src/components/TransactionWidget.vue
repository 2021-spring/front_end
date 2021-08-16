<template>
  <div>
    <v-layout v-if="isPayment"><v-flex class="body-2">Payment <PaymentWidget :value="method" :showCategory="true"></PaymentWidget></v-flex></v-layout>
    <v-layout v-else><v-flex class="body-2">Adjust balance</v-flex></v-layout>
    <v-layout v-if="note"><v-flex class="transaction_note">- {{note}}</v-flex></v-layout>
    <v-layout v-if="estimateDeliverDate"><v-flex>Estimate deliver date: {{estimateDeliverDate}}</v-flex></v-layout>
  </div>
</template>

<script>
import PaymentWidget from './PaymentWidget'

export default {
  name: 'TransactionWidget',
  components: {
    PaymentWidget
  },
  data () {
    return {}
  },
  props: {
    isPayment: Boolean,
    note: String,
    method: Object,
    estimateDeliverDate: String
  }
}
</script>

<style>
.transaction_note {
  overflow-wrap: break-word !important;
  max-width: 30vw !important;
  white-space: pre-wrap;
}
</style>
