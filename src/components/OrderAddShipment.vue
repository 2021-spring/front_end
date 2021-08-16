<template>
  <FormSubmitPopup
    title="Add shipment from order"
    v-model="value"
    @popupClose="$emit('input', false)"
    large
    hideFooter>
    <template v-slot:input>
      <ToEveryone
        :selectedOrder="selectedOrder"
        :template="template"
        onlyOneLabel
        :labelNote="`Label for order ${selectedOrder.orderId}`"
        :order="selectedOrder"
        @submitted="$emit('input', false)">
        <template v-slot:leftBtn>
          <v-btn dark color="primary" @click="$emit('input', false)">Close</v-btn>
        </template>
      </ToEveryone>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import ToEveryone from './ToEveryone'

export default {
  name: 'OrderAddShipment',
  components: {
    FormSubmitPopup,
    ToEveryone
  },
  props: {
    value: Boolean,
    selectedOrder: Object,
    template: Object
  }
}
</script>
