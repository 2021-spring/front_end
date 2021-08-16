<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    :rightButtonText="actionText"
    :large="$vuetify.breakpoint.smAndDown">
    <template v-slot:input>
      <v-container id="take_offer">
        <v-layout class="subheading">
          <v-flex>{{`Offer ID: ${offerTaken.key}`}}</v-flex>
          <v-flex>{{`Organization: ${offerTaken.tenantName}`}}</v-flex>
        </v-layout>
        <v-text-field
          label="Product"
          :value="offerTaken.productCondition + ' - ' + offerTaken.productName"
          :disabled="true"
          prepend-icon="shopping_cart"
        ></v-text-field>
        <v-select
          :items="warehouseTypes"
          v-model="task.warehouse"
          item-text="displayName"
          item-value="value"
          label="Location"
          prepend-icon="local_shipping"
          :rules="[fieldIsRequired('warehouse')]"
          class="required_field"></v-select>
        <v-text-field
          label="Price"
          v-model.number="price"
          :disabled="!isPropose"
          class="required_field"
          :rules="[fieldIsRequired('Price'), fieldIsOverZero('Price')]"
          prepend-icon="attach_money"
        ></v-text-field>
        <v-text-field
          label="Quantity"
          v-model.number="task.quantity"
          autofocus
          class="required_field"
          :rules="[checkQuantity, fieldIsRequired('quantity'), fieldIsInteger('quantity'), fieldIsOverZero('quantity')]"
          prepend-icon="event"
          @keyup="quantityUpdate"
          id="task_quantity"
        ></v-text-field>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'offerTakeTask',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      task: {},
      rules: {
      },
      price: 0,
      quantitySubmitErrorMessage: '',
      taken: 0
    }
  },
  mounted () {
    this.setupOffer()
  },
  watch: {
    'task.warehouse' (value) {
      if (value === 'self') {
        this.price = this.offerTaken.price + (this.offerTaken.bonus || 0)
      } else if (value === 'warehouse') {
        this.price = this.offerTaken.price
      }
    }
  },
  computed: {
    availableQuantity () {
      return (this.offerTaken.quantity - this.taken)
    },
    warehouseTypes () {
      return this.offerTaken.warehouseKeys.length ? (
        this.offerTaken.isOnlyShipToWarehouse ? 
          [ {displayName: 'Warehouse', value: 'warehouse'} ] :
          [ 
            {displayName: 'Warehouse', value: 'warehouse'}, 
            {displayName: 'Self', value: 'self'}
          ]
      ) : [ {displayName: 'Self', value: 'self'} ]
    },
    checkQuantity () {
      if (this.quantitySubmitErrorMessage) return this.quantitySubmitErrorMessage
      if (this.task.quantity <= 0) {
        return 'Must be positive number'
      } else if (!this.isPropose && this.task.quantity > this.availableQuantity) {
        if (this.availableQuantity <= 0) {
          return `Current available quantity is 0`
        } else {
          return `Must be smaller than available quantity (${this.availableQuantity})`
        }
      } else if (!this.isPropose && this.task.warehouse && this.task.warehouse.toLowerCase() === 'self' && this.task.quantity < (this.offerTaken.minQuantity || 0)) {
        return `Must be greater than self warehouse minimum quantity (${this.offerTaken.minQuantity || 0})`
      }
      return true
    }
  },
  methods: {
    setupOffer () {
      let {key, quantity, warehouse, productId, productName, productCondition, price, expirationDate, tenantKey, tenantName, minQuantity = 0, bonus = 0} = this.offerTaken
      let oldQuantity = this.task.quantity ? quantity : undefined
      this.task = {productId, warehouse, productName, productCondition, price, expirationDate, tenantKey, tenantName, minQuantity, quantity: oldQuantity, bonus, comfirmedTotal: 0}
      this.price = this.offerTaken.price

      this.taken = this.offerTaken.taken
      let isNewPropose = (this.offerTaken.isPropose !== true)
      if (this.isPropose && !isNewPropose) {
        this.task.quantity = quantity
        this.task.key = key
      } else {
        this.task.offerKey = key
      }
    },
    quantityUpdate () {
      this.quantitySubmitErrorMessage = ''
    },
    onSubmitted () {
      if (this.price && this.task.quantity && this.task.warehouse) {
        this.quantitySubmitErrorMessage = ''
        if (this.isPropose) {
          this.task.originPrice = this.offerTaken.price
          this.task.originBonus = this.offerTaken.bonus || 0
          this.task.bonus = 0
          this.task.price = this.price
        } else {
          this.task.price = this.offerTaken.price
        }
        this.task.comments = []
        !this.task.note && (this.task.note = '')
        return Promise.resolve(this.actionFunc({offer: this.offerTaken, task: this.task}))
          .catch(error => {
            if (error.message === 'validation-failed') {
              this.taken = error.currentValue
              this.quantitySubmitErrorMessage = `Available quantity changed`
              return
            }
            console.error(error.message)
          })
      }
    }
  },
  props: {
    value: Boolean,
    title: String,
    offerTaken: Object,
    isPropose: {
      type: Boolean,
      default: false
    },
    actionText: {
      type: String,
      default: 'ADD'
    },
    actionFunc: Function
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
</style>
