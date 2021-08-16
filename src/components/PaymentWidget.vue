<template>
  <v-layout :style="color ? `color: ${color};` : ''" column>
    <v-layout v-if="showCategory" align-content-start justify-center style="color: black;"><v-flex>{{value.category}}{{!!value.displayName && ` -- ${value.displayName}`}}</v-flex></v-layout>
    <template v-if="value.category === 'Bank transfer'">
      <PaymentBankTransferWidget
        v-model="value"
        :fullDetail="fullDetail"></PaymentBankTransferWidget>
    </template>
    <template v-if="value.category === 'Bill pay'">
      <PaymentBillPayWidget
        v-model="value"
        :fullDetail="fullDetail"></PaymentBillPayWidget>
    </template>
    <template v-if="value.category === 'Check'">
      <PaymentCheckWidget
        v-model="value"
        :fullDetail="fullDetail"></PaymentCheckWidget>
    </template>
  </v-layout>
</template>

<script>
import PaymentBillPayWidget from './PaymentBillPayWidget'
import PaymentBankTransferWidget from './PaymentBankTransferWidget'
import PaymentCheckWidget from './PaymentCheckWidget'

export default {
  name: 'PaymentWidget',
  components: {
    PaymentBillPayWidget,
    PaymentBankTransferWidget,
    PaymentCheckWidget
  },
  props: {
    value: Object,
    showCategory: Boolean,
    color: {
      type: String,
      default: '#5bc0de'
    },
    fullDetail: Boolean
  }
}
</script>
