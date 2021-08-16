<template>
  <FormSubmitPopup
    title="Adjust Billing"
    v-model="value"
    :rightMethod="onSubmitted"
    rightButtonText="Confirm"
    @popupClose="$emit('input', false)"
    medium>
    <template v-slot:input>
      <v-layout justify-start>
        <v-flex md4>
          <v-autocomplete
            :items="changeTypes"
            v-model="type"
            item-text="displayName"
            item-value="value"
            label="Type"
            class="required_field"></v-autocomplete>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md4>
          <v-text-field
            label="Amount"
            prefix="$"
            class="required_field"
            :rules="[fieldIsRequired('Amount'), fieldIsNumber('Amount')]"              
            hint="Note: Positive value will increase balance"
            persistent-hint
            v-model.number="amount"></v-text-field>
        </v-flex>
      </v-layout>
      <v-textarea
        label="Note"
        outline
        v-model="note"></v-textarea>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'BillingChange',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      note: '',
      amount: 0,
      type: '',
      changeTypes: [{displayName: 'Adjust balance', value: 'adjust'}, {displayName: 'Service fee', value: 'fee'}]
    }
  },
  mounted () {
    this.type = this.changeTypes[0].value
  },
  methods: {
    onSubmitted () {
      let {note, amount, type} = this.$data
      let {key, balance} = this.organization
      return this.$store.dispatch('adjustWarehouseBalance', {note, amount, type, tenantKey: key, balance})
    }
  },
  props: {
    value: Boolean,
    organization: Object
  }
}
</script>
