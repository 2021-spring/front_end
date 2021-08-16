<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="confirmMerge"
    rightButtonText="Merge"
    large>
    <template v-slot:input>
      <v-layout justify-space-between>
        <v-flex sm6>
          <v-list subheader>
            <v-list-tile>
              <v-text-field
                disabled
                label="Current product name"
                :value="productNameDisplay(product)"
                prepend-icon="devices_others"
                class="required_field"></v-text-field>
            </v-list-tile>
          </v-list>
          <br/>
          <v-layout warp justify-space-between>
            <v-flex sm5>
              <v-list subheader>
                <v-list-tile>
                  <v-text-field
                    disabled
                    label="Price"
                    type="number"
                    v-model="product.price"></v-text-field>
                </v-list-tile>
              </v-list>
            </v-flex>
            <v-flex sm5>
              <v-list subheader>
                <v-list-tile>
                  <v-select
                    disabled
                    :items="conditions"
                    v-model="product.condition"
                    label="Condition"
                    prepend-icon="thumbs_up_down"
                    ></v-select>
                </v-list-tile>
              </v-list>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex class="mx-3">
              <v-combobox
                disabled
                v-model="product.asin"
                label="ASIN"
                chips
                multiple
                deletable-chips
                prepend-icon="filter_list"
                clearable></v-combobox>
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
                        disabled
                        v-model="product.upc"
                        prepend-icon="bookmarks"
                        ></v-text-field>
                    </v-flex>
                  </v-layout>
                </v-list-tile>
              </v-list>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex class="mx-3">
              <v-textarea
                disabled
                label="Note"
                outline
                v-model="product.note"
                class="thinBox"></v-textarea>
            </v-flex>
          </v-layout>
        </v-flex>
        <!-- target produsct select -->
        <v-flex sm6>
          <v-list subheader>
            <v-list-tile>
              <v-autocomplete
                :items="products"
                item-value="id"
                return-object
                :item-text="productNameDisplay"
                v-model="targetProduct"
                label="Target product"
                prepend-icon="devices_others"
                class="required_field"
                :rules="[fieldIsRequired('product')]"
                clearable
                >
              </v-autocomplete>
            </v-list-tile>
          </v-list>
          <br/>
          <v-layout warp justify-space-between>
            <v-flex sm5>
              <v-list subheader>
                <v-list-tile>
                  <v-text-field
                    disabled
                    label="Price"
                    prepend-icon="attach_money"
                    type="number"
                    v-model="targetProduct.price"></v-text-field>
                </v-list-tile>
              </v-list>
            </v-flex>
            <v-flex sm5>
              <v-list subheader>
                <v-list-tile>
                  <v-select
                    disabled
                    :items="conditions"
                    v-model="targetProduct.condition"
                    label="Condition"
                    prepend-icon="thumbs_up_down"
                    clearable></v-select>
                </v-list-tile>
              </v-list>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex class="mx-3">
              <v-combobox
                disabled
                :value="targetAsin"
                label="ASIN"
                chips
                multiple
                deletable-chips
                prepend-icon="filter_list"
                clearable></v-combobox>
            </v-flex>
          </v-layout>
          <v-layout warp justify-space-between>
            <v-flex>
              <v-list subheader>
                <v-list-tile>
                  <v-layout justify-space-between align-baseline>
                    <v-flex>
                      <v-text-field
                        disabled
                        label="UPC"
                        v-model="targetProduct.upc"
                        prepend-icon="bookmarks"
                        ></v-text-field>
                    </v-flex>
                  </v-layout>
                </v-list-tile>
              </v-list>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex class="mx-3">
              <v-textarea
                disabled
                id="product_note"
                label="Note"
                outline
                :value="targetNote"
                class="thinBox"></v-textarea>
            </v-flex>
          </v-layout>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-flex sm12 text-lg-center >
          <v-checkbox 
            name="confirmMerge"
            label="After merging, current product will be delete. Only self confirmed quantity will be added to the target product if selected. All related offers and tasks will be linked to the new product" 
            v-model="isConfirmed" 
            color="blue" 
            class="productEditCheckBox" 
            :rules="[v => v || 'Please confirm this info']"
          ></v-checkbox>
        </v-flex>
      </v-layout>
    </template> 
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import BarcodeFinder from '../utils/barcode'
import { checkRules } from '@/utils/tools'

export default {
  name: 'productsMerge',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      isConfirmed: false,
      displayUPC: '',
      conditions: ['new', 'used', 'refurbished'],
      targetProduct: {}
    }
  },
  mounted () {
    this.displayUPC = !this.product.upc || BarcodeFinder.isUpcValid(this.product.upc) ? this.product.upc : `[${this.product.upc}]`
    this.isConfirmed = false
    if (!this.product.condition) this.product.condition = this.conditions[0]
    if (!this.product.price) this.product.price = 0

    this.targetProduct = this.products[0]
  },
  computed: {
    products () {
      return this.$store.getters.products.filter(product => product.id !== this.product.id)
    },
    targetAsin () {
      let asins = [].concat(this.targetProduct.asin || [], this.product.asin || [])
      return asins.filter((asin, index) => asins.indexOf(asin) === index)
    },
    targetNote () {
      return (this.targetProduct.note ? this.targetProduct.note + '\n' : '') + (this.product.note || '')
    }

  },
  methods: {
    confirmMerge () {
      let payload = {
        curProductId: this.product.id,
        targetProductId: this.targetProduct.id,
        beforeValue: {
          currentProduct: this.product,
          targetProduct: this.targetProduct
        },
        payload: {
          targetProductId: this.targetProduct.id,
          targetProduct: {
            ...this.targetProduct,
            asin: this.targetAsin,
            note: this.targetNote
          }
        },
        keywords: [this.targetProduct.upc]
      }
      return this.actionFunc(payload)
    },
    productNameDisplay (product) {
      return product.id + ' - ' + product.name
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
        return {upc: '', condition: this.conditions[0]}
      }
    }
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
</style>
