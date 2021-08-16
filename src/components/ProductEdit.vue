<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="saveProduct"
    hasAlert
    medium>
    <template v-slot:input>
      <v-container fluid>
        <v-list subheader>
          <v-list-tile>
            <v-layout row no-wrap>
              <v-flex v-if="isLinkMode && isLinkExistProduct">
                <v-autocomplete
                  prepend-icon="devices_other"
                  :items="productsWithoutUPC"
                  item-text="name"
                  return-object
                  :filter="customFilter"
                  @input="selectExistProduct"
                  :rules="[fieldIsRequired('Name')]"
                  class="required_field"
                  label="Name"
                  clearable
                >
                  <template v-slot:selection="data">
                    <div>{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
                  </template>
                  <template v-slot:item="data">
                    <div :id="data.item.id">{{data.item.id.slice(-5)}} - {{data.item.condition && data.item.condition.toUpperCase()}} - {{data.item.name}}</div>
                  </template>
                </v-autocomplete>
              </v-flex>
              <v-flex v-else>
                <v-text-field
                  id="product_name"
                  label="Name"
                  v-model="productInEdit.name"
                  prepend-icon="devices_other"
                  :hint="editMode ? 'Note: Updated product name will only reflect in new offers' : ''"
                  persistent-hint
                  :rules="[fieldIsRequired('Name')]"
                  class="required_field"></v-text-field>
              </v-flex>
              <div class="ml-3" :style="{width: '166px'}" v-if="isLinkMode">
                <v-checkbox label="Use exist product" v-model="isLinkExistProduct"></v-checkbox>
              </div>
            </v-layout>
          </v-list-tile>
        </v-list>
        <br/>
        <v-layout warp justify-space-between>
          <v-flex sm5>
            <v-list subheader>
              <v-list-tile>
                <v-text-field
                  id="product_price"
                  label="Price"
                  prepend-icon="attach_money"
                  :rules="[fieldIsNumber(), fieldIsNoLessThanZero()]"
                  v-model.number="productInEdit.price"></v-text-field>
              </v-list-tile>
            </v-list>
          </v-flex>
          <v-flex sm5>
            <v-list subheader>
              <v-list-tile>
                <v-select
                  id="product_condition"
                  :items="conditions"
                  v-model="productInEdit.condition"
                  label="Condition"
                  prepend-icon="thumbs_up_down"
                  class="required_field"
                  :rules="[fieldIsRequired('condition')]"
                  clearable></v-select>
              </v-list-tile>
            </v-list>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex class="mx-3">
            <v-combobox
              id="product_asin"
              v-model="productInEdit.asin"
              label="ASIN"
              chips
              multiple
              deletable-chips
              prepend-icon="filter_list"
              clearable></v-combobox>
          </v-flex>
        </v-layout>
        <v-layout class="mb-1">
          <v-flex class="mx-3">
            <v-combobox
              v-model="productInEdit.sku"
              label="SKU"
              chips
              multiple
              deletable-chips
              prepend-icon="filter_list"
              clearable
              :rules="[checkSkuDup]"></v-combobox>
          </v-flex>
        </v-layout>
        <v-layout warp justify-space-between>
          <v-flex>
            <v-list subheader>
              <v-list-tile>
                <v-layout justify-space-between align-baseline>
                  <v-flex>
                    <v-text-field
                      :id="'upc'"
                      label="UPC"
                      v-model="displayUPC"
                      prepend-icon="bookmarks"
                      :readonly="!productInEdit.isUpcChangeable || upcReadOnly || !!(productInEdit.approvedSkus && productInEdit.approvedSkus.length)"
                      title="Use {} to enter non-standard UPC"
                      :hint="!productInEdit.isUpcChangeable ? 'Warning: Product with stocks or active shipments or approved skus is not allowed to change upc.' : ''"
                      :rules="[rules.upcValid, rules.upcDup]"></v-text-field>
                  </v-flex>
                </v-layout>
              </v-list-tile>
            </v-list>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex class="ml-3 confirm_upc">
            <v-checkbox 
              v-if="upcWarning" 
              :label="upcWarning" 
              v-model="isConfirmed" 
              color="blue" 
              class="productEditCheckBox" 
              name="confirmUpc" 
              :rules="[v => v || 'Please confirm upc.']"></v-checkbox>
          </v-flex>
        </v-layout>
        <v-layout id="product_note">
          <v-flex class="mx-3">
            <v-textarea
              label="Note"
              outline
              v-model="productInEdit.note"
              class="thinBox"></v-textarea>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import BarcodeFinder from '../utils/barcode'
import { checkRules, cloneDeep } from '@/utils/tools'

export default {
  name: 'productEdit',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      rules: {
        upcValid: (value) => {
          return !value || !!value.match(/^\{.+\}$/g) || BarcodeFinder.isUpcValid(value) || 'invalid UPC'
        },
        upcDup: (value) => {
          if (this.isLinkMode) return true
          let upcToCheck = value && value.replace(/^\{(.+)\}$/g, '$1').trim()
          if (upcToCheck) {
            return this.products.some(product => {
              return product.id !== this.product.id && (product.upc || '').toUpperCase() === (upcToCheck || '').toUpperCase()
            }) ? 'UPC already exists' : true
          }
          return true
        }
      },
      isConfirmed: false,
      displayUPC: '',
      conditions: ['new', 'used', 'refurbished'],
      isLinkExistProduct: false,
      productInEdit: {},
      productsWithoutUPC: [],
      isSaving: false,
      skuSet: {},
      checkSkuDup: (v) => {
        const dups = v.filter ? v.filter(item => this.skuSet.has(item)) : []
        return dups.length === 0 || `Sku: ${dups} has been assgined to another product.`
      }
    }
  },
  watch: {
    isLinkExistProduct (val) {
      this.setProductInEdit()
    },
    products (value) {
      !this.isSaving && (this.productsWithoutUPC = this.products.filter(product => !(product.upc && product.upc !== '')))
    }
  },
  created () {
    this.skuSet = cloneDeep(this.$store.getters.skuSet)
    if (this.product.sku) {
      this.product.sku.forEach(item => {
        this.skuSet.delete(item)
      })
    }
  },
  mounted () {
    this.isLinkExistProduct = this.isLinkMode
    this.setProductInEdit()
    this.productsWithoutUPC = this.products.filter(product => product.upc === this.product.upc || !(product.upc && product.upc !== ''))
  },
  computed: {
    upcValue () {
      return this.displayUPC ? this.displayUPC.replace(/^\{(.+)\}$/g, '$1').trim() : ''
    },
    isUPCChanged () {
      return this.upcValue !== this.productInEdit.upc
    },
    upcWarning () {
      if (this.isUPCChanged) {
        if (!this.displayUPC) {
          return 'Please confirm. Warning: leaving UPC empty will cause inbound packages not able to link'
        } else {
          return 'Please confirm. Warning: wrong UPC code will cause inbound packages to link incorrectly'
        }
      } else {
        return ''
      }
    },
    products () {
      return this.$store.getters.products
    }
  },
  methods: {
    saveProduct () {
      this.productInEdit.upc = this.upcValue
      if (this.productInEdit.approvedSkus) {
        // check whether approved sku being deleted
        const skuSet = new Set(this.productInEdit.sku || [])
        if (this.productInEdit.approvedSkus.some(item => !skuSet.has(item.split('_')[1]))) {
          throw Error('Approved sku can not be deleted.')
        }
      }

      this.productInEdit.sku.forEach(item => {
        if (this.skuSet.has(item)) throw Error(`Sku: ${item} has been assgined to another product.`)
      })

      let {isUpcChangeable, ...rest} = this.productInEdit
      this.isSaving = true
      return this.actionFunc(rest, true)
        .catch(error => {
          this.isSaving = false
          throw error
        })
    },
    selectExistProduct (product) {
      this.productInEdit = {...product, upc: this.productInEdit.upc}
    },
    setProductInEdit () {
      this.productInEdit = {...this.product}
      this.displayUPC = !this.productInEdit.upc || BarcodeFinder.isUpcValid(this.productInEdit.upc) ? this.productInEdit.upc : `{${this.productInEdit.upc}}`
      this.isConfirmed = false
      if (!this.productInEdit.condition) this.productInEdit.condition = this.conditions[0]
      if (!this.productInEdit.price) this.productInEdit.price = 0
      if (this.productInEdit.isUpcChangeable === undefined) this.productInEdit.isUpcChangeable = true
      if (!this.productInEdit.sku) this.productInEdit.sku = []
    },
    customFilter (item, queryText, itemText) {
      const textOne = item.name ? item.name.toLowerCase() : ''
      const textTwo = item.id ? item.id.toLowerCase() : ''
      const searchText = queryText.toLowerCase()

      return textOne.indexOf(searchText) > -1 ||
        textTwo.indexOf(searchText) > -1
    }
  },
  props: {
    value: Boolean,
    title: String,
    editMode: {
      type: Boolean,
      default: false
    },
    actionFunc: Function,
    product: {
      type: Object,
      default: function () {
        return {upc: '', condition: this.conditions[0], isUpcChangeable: true}
      }
    },
    upcReadOnly: Boolean,
    isLinkMode: Boolean
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}

.thinBox .input-group__input {
  border: 1px solid rgba(0,0,0,.54) !important;
}

.productEditCheckBox label {
  color: #1976d2 !important;
}

.confirm_upc .input-group.input-group--selection-controls label {
  max-width: 95%;
}

#product_note {
  position: relative;
  top: 10px;
}
</style>
