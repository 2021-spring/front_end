<template>
  <SimpleTextPopup
    title="Select Product"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    large>
    <template v-slot:input>
      <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-layout>
          <v-flex md3>
            <v-tab v-for="tabItem in tabs" :key="tabItem">
              <span class="tabItem">{{ tabItem }}</span>
            </v-tab>
          </v-flex>
          <v-flex md4></v-flex>
          <v-flex>
            <v-checkbox label="Show all" v-if="skus.size > 0" v-model="isShowAll"></v-checkbox>
          </v-flex>
          <v-flex>
            <v-checkbox label="pin popup" v-model="isKeptDialog"></v-checkbox>
          </v-flex>
        </v-layout>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <v-tabs-items v-model="tab" touchless>
          <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
            <v-container fluid v-if="index === 0 && tab === 0">
              <v-layout justify-end>
                <v-flex xs8 md2>
                  <v-text-field
                    append-icon="filter_list"
                    label="Search"
                    single-line
                    hide-details
                    v-model="filter"
                  ></v-text-field>
                </v-flex>
              </v-layout>
              <v-data-table
                :headers="headers"
                :items="products"
                :search="filter"
                class="my-1 levation-2 myDense"
                :pagination.sync="pagination"
                :rows-per-page-items="rowPerPage">
                <template v-slot:items="props">
                  <td class="subheading">{{ props.index + 1}}</td>
                  <td>
                    <v-layout>
                      <v-flex md5>
                        <ProductWidget
                          :name="props.item.name"
                          :condition="props.item.condition"
                          :upc="props.item.upc"
                          :asin="props.item.asin"
                          :sku="props.item.sku"></ProductWidget>
                      </v-flex>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-right">
                    <v-layout row>
                      <v-flex><v-btn dark color="primary" flat @click.stop="showAddProductDialog(props.item)">Select</v-btn></v-flex>
                      <v-flex><v-btn dark color="primary" flat @click.stop="showEditProductDialog(props.item)">Edit</v-btn></v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </v-container>
            <v-container fluid v-if="index === 1 && tab === 1">
              <v-layout justify-space-between>
                <v-flex xs8 md2>
                  <v-autocomplete
                    label="Users"
                    :items="users"
                    item-text="name"
                    item-value="uid"
                    v-model="selectedUser"
                    >
                    <template v-slot:item="data">
                      <template v-if="typeof data.item !== 'object'">
                        <v-list-tile-content v-text="data.item"></v-list-tile-content>
                      </template>
                      <template v-else>
                        <v-list-tile-content>
                          <v-list-tile-title>
                            <v-icon v-if="!data.item.uid">supervisor_account</v-icon>
                            <template v-else>
                              <v-icon v-if="data.item.approvalType">perm_identity</v-icon>
                              <v-icon v-else>local_shipping</v-icon>
                            </template>
                            {{data.item.name}}
                          </v-list-tile-title>
                        </v-list-tile-content>
                      </template>
                    </template>
                  </v-autocomplete>
                </v-flex>
                <v-flex xs8 md2>
                  <v-text-field
                    append-icon="filter_list"
                    label="Search"
                    single-line
                    hide-details
                    v-model="filter"
                  ></v-text-field>
                </v-flex>
              </v-layout>
              <v-data-table
                :headers="headers"
                :items="distribution"
                :search="filter"
                class="levation-2 myDense"
                :pagination.sync="pagination"
                item-key="fbmKey"
                :rows-per-page-items="rowPerPage">
                <template v-slot:items="props">
                  <td class="subheading">{{ props.index + 1}}</td>
                  <td>
                    <ProductWidget
                      :name="props.item.name"
                      :condition="props.item.condition"
                      :upc="props.item.upc"
                      :asin="props.item.asin"
                      :sku="props.item.sku"></ProductWidget>
                  </td>
                  <td class="text-xs-left">{{ props.item.userName }}</td>
                  <td class="text-xs-left">{{ props.item.siteName }}</td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-right">
                    <v-layout row>
                      <v-flex>
                        <v-btn 
                          v-if="addedDistributionSet.has(props.item.fbmKey)"
                          color="success" 
                          flat 
                          @click.stop="$emit('deleteDistribution', props.item)"
                        >Added</v-btn>
                        <v-btn 
                          v-else
                          color="primary" 
                          flat 
                          @click.stop="addDistribution(props.item)"
                        >Add</v-btn>
                      </v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </v-container>
          </v-tab-item>
        </v-tabs-items>
      </v-tabs>

      <InventoryDetails
        title="Select Location"
        v-model="addProductDialog"
        v-if="addProductDialog"
        :product="productInEdit"
        @deleteDistribution="(item) => $emit('deleteDistribution', item)"
        @addDistribution="(item) => addDistribution(item)"
        :addedDistributionSet="addedDistributionSet"
        :editMode="true"
        :skus="skus"
        :allDistribution="distribution"></InventoryDetails>
      <ProductEdit
        title="Edit product"
        v-model="editProductDialog"
        v-if="editProductDialog"
        :actionFunc="editProduct"
        :product="productInEdit"
        :editMode="true"></ProductEdit>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import ProductWidget from './ProductWidget'
import InventoryDetails from './InventoryDetails'
import ProductEdit from './ProductEdit'

export default {
  name: 'AddInventories',
  components: {
    SimpleTextPopup,
    ProductWidget,
    InventoryDetails,
    ProductEdit
  },
  data () {
    return {
      filter: '',
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      tab: this.initTab,
      tabs: ['By product', 'By user'],
      selectedUser: '',
      isKeptDialog: false,
      addProductDialog: false,
      productInEdit: {},
      isShowAll: this.skus.size === 0,
      editProductDialog: false
    }
  },
  mounted () {
    this.selectedUser = ''
  },
  computed: {
    products () {
      let products = this.$store.getters.products
        .map((product) => {
          return {...product, quantity: this.distribution.reduce((acc, item) => item.id === product.id ? item.quantity + acc : acc, 0)}
        })
        .filter(product => {
          return product.distribution 
            && Object.keys(product.distribution).length > 0
        })
      // filter self storage
      if (this.hasOnlyWarehouse) {
        return products
          .filter(item => {
            return item.distribution 
              && Object.keys(item.distribution)
                .some(key => item.distribution[key].warehouseKey)
          })
      }
      // filter other sku
      if (this.skus.size > 0 && !this.isShowAll) {
        return products
          .filter(item => {
            return item.sku 
              && item.sku
                .some(sku => this.skus.has(sku))
          })
      }
      return products
    },
    users () {
      if (this.hasOnlyWarehouse) {
        return [
          {
            name: '-- All --', 
            uid: ''
          }, 
          ...this.warehouses
        ].filter(item => item.name !== 'Others')
      }
      return [
        {
          name: '-- All --', 
          uid: ''
        }, 
        ...this.warehouses, 
        ...this.$store.getters.users
      ]
    },
    warehouses () {
      if (this.$store.getters.warehouses && this.$store.getters.warehouses.length > 0) {
        return this.$store.getters.warehouses.map(warehouse => { 
          return {
            name: warehouse.warehouseName, 
            uid: warehouse.warehouseKey
          } 
        })
      }
      return []
    },
    distribution () {
      let rtn = this.allDistribution
      if (this.hasOnlyWarehouse) {
        rtn = rtn.filter(item => item.warehouseKey)
      }
      if (this.skus.size > 0 && !this.isShowAll) {
        rtn = rtn.filter(item => item.sku && item.sku.some(sku => this.skus.has(sku)))
      }
      if (this.selectedUser) {
        rtn = rtn.filter((fbm) => fbm.uid === this.selectedUser)
      }
      return rtn
    },
    headers () {
      if (this.tab === 0) {
        return [
          { text: 'ID#', value: 'asinForSearch', align: 'left', sortable: false, width: '5%' },
          { text: 'Product', value: 'name', align: 'left', sortable: false },
          { text: 'Quantity', value: 'quantity', align: 'left', sortable: true },
          { text: 'Action', value: 'upc', align: 'center', sortable: false, width: '8%' }
        ]
      } else if (this.tab === 1) {
        return [
          { text: 'ID#', value: 'asinForSearch', align: 'left', sortable: false, width: '5%' },
          { text: 'Product', value: 'name', align: 'left', sortable: false },
          { text: 'User name', value: 'quantity', align: 'left', sortable: false },
          { text: 'Site', value: 'siteName', align: 'left', sortable: false },
          { text: 'Quantity', value: 'quantity', align: 'left', sortable: true },
          { text: 'Action', value: 'upc', align: 'center', sortable: false, width: '8%' }
        ]
      }
    }
  },
  watch: {
    tab (value) {
      this.filter = ''
      this.selectedUser = ''
    }
  },
  methods: {
    showEditProductDialog (item) {
      let {inbound, quantity, ...productInEdit} = item
      this.productInEdit = productInEdit
      this.editProductDialog = true
    },
    showAddProductDialog (product) {
      this.productInEdit = product
      this.addProductDialog = true
    },
    addDistribution (item) {
      this.$emit('addDistribution', item)
      if (!this.isKeptDialog) {
        this.$emit('input', false)
      }
    },
    editProduct (product) {
      !product.upc && (product.upc = '')
      product.asin && (product.asin = product.asin.map(asin => {
        return asin.trim()
      }))
      product.sku && (product.sku = product.sku.map(sku => {
        return sku.trim()
      }))
      /* eslint-disable no-unused-vars */
      let newProduct = {...product}
      delete newProduct.onlyForSearch
      return this.$store.dispatch('editProduct', {newProduct})       
        .catch(error => {
          this.showToast('failed to update product', error.message)
        })
    }
  },
  props: {
    value: Boolean,
    hasOnlyWarehouse: Boolean,
    addedDistributionSet: Set,
    skus: {
      type: Map,
      default: () => {
        return new Map()
      }
    },
    initTab: {
      type: Number,
      default: () => {
        return 0
      }
    },
    allDistribution: Array
  }
}
</script>
