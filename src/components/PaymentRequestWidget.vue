<template>
  <div class="payment-request-widget">
    <v-layout warp><PaymentWidget :value="method" :showCategory="true"></PaymentWidget></v-layout>
    <v-layout warp v-if="!!comments">
      <v-flex class="long-item text-truncate">
        <b v-if="lastComment">{{comments[comments.length - 1].name}}: </b>
        {{lastComment.split('\n')[0]}} {{lastComment.split('\n')[1] ? '…' : ''}}
      </v-flex>
    </v-layout>
    <!-- <v-layout warp><v-flex v-bind:style="{ whiteSpace: 'pre-wrap' }">{{method.creditCardCompany || method.bankName}}</v-flex></v-layout> -->
  </div>
</template>
<script>
import PaymentWidget from './PaymentWidget'

export default {
  name: 'PaymentRequestWidget',
  components: {
    PaymentWidget
  },
  data () {
    return {}
  },
  computed: {
    lastComment () {
      return this.comments[this.comments.length - 1] ? this.comments[this.comments.length - 1].content : ''
    }
  },
  props: {
    method: Object,
    comments: Array
  }
}
</script>
<style>
.payment-request-widget .long-item {
  max-width: 440px;
  overflow-wrap: break-word;
}
</style>
