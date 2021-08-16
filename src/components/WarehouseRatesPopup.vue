<template>
  <SimpleTextPopup
    title="Warehouse Rates"
    v-model="value"
    @popupClose="$emit('input', false)"
    hideRgtBtn
    large>
    <template v-slot:input>
      <v-container fluid>
        <v-layout class="headline">
          VIP discount: &nbsp;
          <span class="text-capitalize" v-if="JSON.stringify(discount) !== '{}'">
            {{discount.name}}&nbsp;({{ discount.discountRate }}%)
          </span>
          <span class="text-capitalize" v-else>
            N/A
          </span>
        </v-layout>
      </v-container>
      <BillingSettingsDisplay
        :displayMode="true"
        :selectedWarehouseLimitedInfo="selectedWarehouseLimitedInfo"/>
    </template>
  </SimpleTextPopup>
</template>

<script>
import BillingSettingsDisplay from './BillingSettingsDisplay'
import SimpleTextPopup from './SimpleTextPopup'

export default {
  name: 'WarehouseRatesPopup',
  components: {
    BillingSettingsDisplay,
    SimpleTextPopup
  },
  data () {
    return {
      discount: {}
    }
  },
  async created () {
    this.discount = (await this.$store.dispatch('getTenantDiscount', {warehouseKey: this.selectedWarehouseLimitedInfo.key})) || {}
  },
  props: {
    value: Boolean,
    selectedWarehouseLimitedInfo: Object
  }
}
</script>
