<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Submit"
    hasAlert
    medium>
    <template v-slot:input>
      <v-container>
        <v-layout>
          <v-autocomplete
            :items="products"
            item-text="name"
            return-object
            :filter="customFilter"
            v-model="productSelected"
            label="Product"
            prepend-icon="devices_other"
            clearable
          >
            <template v-slot:selection="data">
              <div>{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
            </template>
            <template v-slot:item="data">
              <div :id="data.item.id">{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
            </template>
          </v-autocomplete>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-text-field
              label="UPC"
              v-model="upc"
              class="required_field"
              readonly
              :rules="[fieldIsRequired('upc'), (v) => upcSet.has(v) || 'Upc does not exist, please define product first.']"></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-autocomplete
              :items="skusForSelect"
              v-model="sku"
              label="SKU"
              class="required_field"
              :rules="[fieldIsRequired('sku')]"
              clearable
            ></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-autocomplete
              :items="warehouses"
              return-object
              item-text="warehouseName"
              v-model="warehouseSelected"
              label="Warehouse"
              class="required_field"
              :rules="[fieldIsRequired('warehouse')]"
            ></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-textarea
              label="Note"
              v-model="note"
              outline
            ></v-textarea>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template> 

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'SkuRequestPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      title: 'Add SKU request',
      sku: '',
      note: '',
      upc: '',
      productSelected: {},
      skusForSelect: [],
      key: '',
      warehouseSelected: {}
    }
  },
  computed: {
    products () {
      let rtn = [...this.$store.getters.products]
      rtn.sort((a, b) => b.id < a.id ? -1 : 1)
      return rtn
    },
    upcSet () {
      return new Set(this.products
        .filter(item => item.upc)
        .map(item => item.upc))
    },
    warehouses () {
      return this.$store.getters.warehouses.filter(item => item.warehouseName !== 'Others')
    },
    requests () {
      return this.$store.getters.skuRequests
    }
  },
  watch: {
    productSelected (val) {
      if (val && JSON.stringify(val) !== '{}') {
        this.upc = val.upc
        this.skusForSelect = val.sku
        this.note = val.name
      } else {
        this.skusForSelect = []
      }
    }
  },
  methods: {
    customFilter (item, queryText, itemText) {
      const textOne = item.name ? item.name.toLowerCase() : ''
      const textTwo = item.id ? item.id.toLowerCase() : ''
      const searchText = queryText.toLowerCase()

      return textOne.indexOf(searchText) > -1 ||
        textTwo.indexOf(searchText) > -1
    },
    onSubmitted () {
      const { sku, note, upc, warehouseSelected } = this
      const { warehouseKey } = warehouseSelected
      if (this.products.some(product => {
        return product.approvedSkus && product.approvedSkus.some(approvedSku => approvedSku === `${warehouseKey}_${sku}`)
      })) throw Error('This upc-sku match has been approved.')

      if (this.requests.some(request => {
        const {sku: reqSku, upc: reqUpc, warehouseKey: reqWarehouseKey} = request
        return sku === reqSku &&
          upc === reqUpc &&
          warehouseKey === reqWarehouseKey
      })) throw Error('This upc-sku match request has been created.')
      return this.$store.dispatch('addSkuRequest', { sku, note, upc, warehouseKey })
    }
  },
  props: {
    value: Boolean
  }
}
</script>
