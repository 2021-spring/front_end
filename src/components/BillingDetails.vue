<template>
  <SimpleTextPopup
    title="Billing details"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    :outsideScrollToBottom="outsideScrollToBottom"
    large
  >
    <template v-slot:input>
      <BillingTransactionTable
        :outsideScrollToBottom="popupToBottom"
        :tenantKey="tenantKey"
        :warehouseKey="warehouseKey"/>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import BillingTransactionTable from './BillingTransactionTable'

export default {
  name: 'BillingDetails',
  components: {
    SimpleTextPopup,
    BillingTransactionTable
  },
  data () {
    return {
      popupToBottom: false
    }
  },
  computed: {

  },
  methods: {
    outsideScrollToBottom (flag) {
      this.popupToBottom = flag
    }
  },
  props: {
    value: Boolean,
    tenantKey: String,
    warehouseKey: String
  }
}
</script>
