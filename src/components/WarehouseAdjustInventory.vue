<template>
  <FormSubmitPopup
    title="Adjust inventory"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Confirm"
    hasAlert
    medium>
    <template v-slot:input>
      <v-layout align-end justify-start>
        <v-flex md3>
          <v-autocomplete
            :items="warehousesSites"
            item-text="siteName"
            return-object
            v-model="warehouseSite"
            label="Warehouse site"
            :rules="[fieldIsRequired('Warehouse site')]"
            class="required_field"></v-autocomplete>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md3>
          <v-text-field
            label="Permission code"
            class="required_field"
            :rules="[v => v === '20200125' || 'Wrong permission code.']"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-flex md3>
          <v-autocomplete
            :items="organizations"
            item-text="displayName"
            return-object
            v-model="from"
            label="From"
            :rules="[fieldIsRequired('Organization')]"
            class="required_field"></v-autocomplete>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md3>
          <v-autocomplete
            :items="organizations"
            item-text="displayName"
            return-object
            v-model="to"
            label="To"
            :rules="[fieldIsRequired('Organization')]"
            class="required_field"></v-autocomplete>
        </v-flex>
      </v-layout>
      <v-layout align-end justify-start>
        <v-flex md3>
          <v-text-field
            label="UPC"
            class="required_field"
            v-model="upc"></v-text-field>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md3>
          <v-text-field
            label="Quantity"
            class="required_field"
            :rules="[fieldIsNumber(), fieldIsNoLessThanZero()]"
            v-model.number="quantity"></v-text-field>
        </v-flex>
      </v-layout>
      <v-textarea
        id="balance_note"
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
  name: 'AdjustInventory',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      upc: '',
      quantity: 0,
      note: '',
      from: {},
      to: {},
      warehouseSite: {}
    }
  },
  computed: {
    organizations () {
      return [...this.$store.getters.sortedWarehouseOrganizations]
    },
    warehousesSites () {
      return this.$store.getters.warehousesSites
    }
  },
  methods: {
    onSubmitted () {
      return this.$store.dispatch('adjustInventory', this.$data)
        .then(() => {
          return this.actionAfterSubmit()
        })
    }
  },
  props: {
    value: Boolean,
    actionAfterSubmit: Function
  }
}
</script>
