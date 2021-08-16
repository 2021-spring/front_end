<template>
  <div>
    <div>
      <p v-if="isBillingBalanceBelowCritical" class="warning_text">
        This feature is disabled because of low balance with this warehouse.
      </p>
      <p v-if="hasProductEmptyUpc" class="warning_text">
        Products must have upc.
      </p>
      <p v-if="submitError" class="warning_text">
        {{ submitError }}
      </p>
      <slot></slot>
      <v-btn color="primary" @click.stop="showAddInventoriesDialog()" :disabled="isBillingBalanceBelowCritical">Add Item</v-btn>
    </div>
    <v-data-table
      :headers="headers"
      :items="Object.values(value)"
      class="elevation-2 myDense"
      item-key="shipmentProductKey"
      hide-actions>
      <template v-slot:items="props">
        <td>
          <ProductWidget
            :name="props.item.name"
            :condition="props.item.condition"
            :upc="props.item.upc"></ProductWidget>
        </td>
        <td class="text-xs-left">{{ props.item.userName}}</td>
        <td class="text-xs-left">{{ props.item.siteName }}</td>
        <td class="text-xs-left">
          <v-flex md6>
            <v-text-field
              v-model.number="props.item.toShip"
              autofocus
              @change="quantityChanged($event, props.item)"
              mask="#####"></v-text-field>   
          </v-flex>
        </td>
        <td class="text-xs-left">
          <v-flex md6>
            <v-text-field v-model.number="props.item.unitPrice"></v-text-field>   
          </v-flex>
        </td>
        <td class="text-xs-left">{{ props.item.quantity }}</td>
        <td class="text-xs-right">
          <v-layout row>
            <v-flex><v-btn dark color="primary" flat @click.stop="deleteProduct(props.item)">Remove</v-btn></v-flex>
          </v-layout>
        </td>
      </template>
    </v-data-table>
    <AddInventories
      title="Select Product"
      v-model="addInventoriesDialog"
      v-if="addInventoriesDialog"
      @deleteDistribution="(item) => deleteProduct(item)"
      @addDistribution="(item) => addProduct(item)"
      :addedDistributionSet="addedDistributionSet"
      :editMode="true"
      hasOnlyWarehouse
      :allDistribution="allDistribution"></AddInventories>
  </div>
</template>

<script>
import ProductWidget from './ProductWidget'
import AddInventories from './AddInventories'
import { checkRules } from '../utils/tools'
import * as rules from '../utils/rules'

export default {
  name: 'ProductTableAndSelect',
  components: {
    ProductWidget,
    AddInventories
  },
  mixins: [checkRules],
  data () {
    return {
      headers: [
        { text: 'Product', value: 'name', align: 'left', sortable: false },
        { text: 'Warehouse', value: 'user', align: 'left', sortable: false },
        { text: 'Site name', value: 'siteName', align: 'left', sortable: false },
        { text: 'To transfer', value: 'toShip', align: 'left', sortable: false },
        { text: 'Unit price', value: 'unitPrice', align: 'left', sortable: false },
        { text: 'Available', value: 'quantity', align: 'left', sortable: false },
        { text: 'Action', value: 'upc', align: 'center', sortable: false, width: '8%' }
      ],
      addInventoriesDialog: false,
      addProductDialog: false,
      productInEdit: {},
      selectedDistributions: {}
    }
  },
  computed: {
    hasProductEmptyUpc () {
      return Object.values(this.value).some(product => !product.upc)
    },
    allDistribution () {
      return this.$store.getters.allDistribution
    },
    addedDistributionSet () {
      return new Set(Object.keys(this.selectedDistributions || {}))
    }
  },
  methods: {
    showAddInventoriesDialog () {
      this.addInventoriesDialog = true
    },
    showAddProductDialog (product) {
      this.productInEdit = product
      this.addProductDialog = true
    },
    addProduct (distribution) {
      this.$set(this.selectedDistributions, distribution.fbmKey, {
        ...distribution, 
        toShip: 0, 
        shipmentProductKey: `${distribution.warehouseSite}${distribution.id}`
      })
      this.$emit('input', this.selectedDistributions)
      this.addInventoriesDialog = false
    },
    deleteProduct (distribution) {
      this.$delete(this.selectedDistributions, distribution.fbmKey)
      this.$emit('input', this.selectedDistributions)
    },
    quantityChanged (event, item) {
      if (rules.isNumber(event) === true) {
        if (event > item.quantity) {
          alert(`input exceed available quantity of ${item.quantity}`)
          item.toShip = item.quantity
        }
      } else {
        alert('quantity format invalid')
      }
    }
  },
  props: {
    value: Object,
    submitError: String,
    isBillingBalanceBelowCritical: Boolean
  } 
}
</script>

<style>
.warning_text {
  color:  red;
}
</style>
