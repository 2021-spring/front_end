<template>
  <v-container fluid>
    <v-card>
      <v-snackbar
        :timeout="30000"
        :top="true"
        :color="toastColor"
        v-model="toastEnable"
      >
        {{ toastText }}
        <v-btn dark flat @click.stop="toastEnable = false">Close</v-btn>
      </v-snackbar>
    </v-card>

    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-spacer></v-spacer>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <div v-if="tab === 0 && index === 0">
            <v-layout justify-start>
              <v-flex>
                <v-layout row nowrap>
                  <v-btn dark color="primary" @click.stop="showAddProductDialog" id="addProduct"><v-icon dark>add</v-icon>Add product</v-btn>
                  <v-menu offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn @click.stop="on.click" dark color="primary">
                        Export <v-icon>expand_more</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-tile @click="exportAllInventory">
                        <v-list-tile-title>Export all</v-list-tile-title>
                      </v-list-tile>
                      <v-list-tile v-if="selectedProducts.length" @click="exportSelectedInventory">
                        <v-list-tile-title>Export selected</v-list-tile-title>
                      </v-list-tile>
                    </v-list>
                  </v-menu>
                  <v-btn color="primary"  @click.stop="batchArchive" :disabled="selectedProducts.length === 0">Archive selected</v-btn>
                </v-layout>
              </v-flex>
              <v-spacer></v-spacer>
              <v-flex align-self-center>
                <v-layout align-center justify-center>
                  <v-flex xs6 subheading>Total: <span>${{ products.reduce((sum, {value}) => addNumbers(sum, value || 0), 0).toLocaleString() }}</span></v-flex>
                  <v-flex xs6 subheading>Current page: <span>${{
                    ($refs.rtProductsTable && $refs.rtProductsTable[0] && $refs.rtProductsTable[0].filteredItems.reduce((sum, {value}) => addNumbers(sum, value || 0), 0).toLocaleString()) || 0
                  }}</span></v-flex>
                </v-layout>
              </v-flex>
              <v-spacer></v-spacer>
              <v-flex xs4 md2>
                <v-text-field
                  append-icon="filter_list"
                  label="Search"
                  single-line
                  hide-details
                  v-model="filter"
                  clearable
                ></v-text-field>
              </v-flex>
            </v-layout>
            <v-layout justify-start align-baseline>
              <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
            </v-layout>

            <v-data-table
              :headers="headers"
              :items="products"
              class="elevation-2 myDense"
              :search="filter"
              select-all="blue"
              v-model="selectedProducts"
              :pagination.sync="pagination"
              item-key="id"
              :rowsPerPageItems="rowsPerPageItems"
              ref="rtProductsTable"
            >
              <template v-slot:items="props">
                <tr :active="props.selected" @click="props.selected = !props.selected">
                  <td>
                    <v-checkbox
                      v-model="props.selected"
                      primary
                      @click="props.selected = !props.selected"
                      hide-details
                    ></v-checkbox>
                  </td>
                  <td class="subheading">{{ props.item.id && props.item.id.slice(-5) }}</td>
                  <td>
                    <ProductWidget
                      :name="props.item.name"
                      :condition="props.item.condition"
                      :price="props.item.price"
                      :asin="props.item.asin"
                      :note="props.item.note"
                      :sku="props.item.sku"></ProductWidget>
                  </td>
                  <td class="text-xs-left">{{ props.item.upc }}</td>
                  <td class="text-xs-left">{{ props.item.inbound }}</td>
                  <td class="text-xs-left">{{ props.item.quantity }}</td>
                  <td class="text-xs-left">{{ props.item.value && `$${props.item.value.toLocaleString()}` }}</td>
                  <!-- <td class="text-xs-left">{{ props.item.fba }}</td> -->
                  <td class="text-xs-right">
                    <v-layout row nowrap>
                      <v-btn dark color="primary" flat @click.stop="showProductDetail(props.item)">Detail</v-btn>
                      <v-btn dark color="primary" flat @click.stop="showAddOfferDialog({initProduct: props.item})">Add offer</v-btn>
                      <v-menu offset-y>
                        <template v-slot:activator="{ on }">
                          <v-btn @click.stop="on.click" dark flat color="primary">
                            Other<v-icon>expand_more</v-icon>
                          </v-btn>
                        </template>
                        <v-list>
                          <v-list-tile @click="showEditProductDialog(props.item)">
                            <v-list-tile-title>Edit</v-list-tile-title>
                          </v-list-tile>
                          <v-list-tile @click="archiveSingleProduct(props.item)">
                            <v-list-tile-title>Archive</v-list-tile-title>
                          </v-list-tile>
                          <v-list-tile v-if="memberType > 0" @click="showMergeProductDialog(props.item)">
                            <v-list-tile-title>Merge</v-list-tile-title>
                          </v-list-tile>
                        </v-list>
                      </v-menu>
                    </v-layout>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </div>
          <div v-if="tab === 1 && index === 1">
            <PaginationController
              v-model="archivedProducts"
              getDataActionName="getArchivedProducts"
              :historyLimit="historyLimit"
              :haveSearchBox="true"
              :searchBoxLabel="'Keyword / upc / asin'"
            >
              <template v-slot:dataTable>
                <v-data-table
                  :headers="headers"
                  :items="archivedProducts"
                  class="elevation-2 myDense"
                  hide-actions
                >
                  <template v-slot:progress>
                    <v-progress-linear color="blue" indeterminate></v-progress-linear>
                  </template>
                  <template v-slot:items="props">
                    <td class="subheading">{{ props.item._key && props.item._key.slice(-5) }}</td>
                    <td>
                      <ProductWidget
                        :name="props.item.name"
                        :condition="props.item.condition"
                        :price="props.item.price"
                        :asin="props.item.asin"
                        :note="props.item.note"
                        :sku="props.item.sku"></ProductWidget>
                    </td>
                    <td class="text-xs-left">{{ toDateString(props.item.createTime) }}</td>
                    <td class="text-xs-left">{{ props.item.upc }}</td>
                    <td class="text-xs-left">{{ props.item.inbound }}</td>
                    <!-- <td class="text-xs-left">{{ props.item.fba }}</td> -->
                    <td class="text-xs-right">
                      <v-layout row>
                        <v-flex><v-btn dark color="primary" flat @click.stop="showProductDetail(props.item)">Detail</v-btn></v-flex>
                        <v-flex><v-btn dark color="primary" flat @click.stop="restoreProduct(props.item)">Restore</v-btn></v-flex>
                      </v-layout>
                    </td>
                  </template>
                </v-data-table>
              </template>
            </PaginationController>
          </div>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <ProductEdit
      title="Edit product"
      v-model="editProductDialog"
      v-if="editProductDialog"
      :actionFunc="editProduct"
      :product="productInEdit"
      :editMode="true"></ProductEdit>
    <ProductEdit
      title="Add product"
      v-model="addProductDialog"
      v-if="addProductDialog"
      actionText="Add"
      :actionFunc="addProduct"
      :product="productInEdit"></ProductEdit>
    <ProductsMerge
      title="Merge products"
      v-model="productsMergeDialog"
      v-if="productsMergeDialog"
      actionText="Merge"
      :actionFunc="mergeProducts"
      :product="productInEdit" />
    <ProductDetail
      v-model="productDetailDialog"
      v-if="productDetailDialog"
      :product="productInEdit"></ProductDetail>
    <OfferEdit
      title="Add offer"
      v-model="addOfferDialog"
      v-if="addOfferDialog"
      actionText="Add"
      :actionFunc="addOffer"
      :initProduct="initProduct"></OfferEdit>
  </v-container>
</template>

<script>

import ProductEdit from './ProductEdit'
import ProductsMerge from './ProductsMerge'
import ProductWidget from './ProductWidget'
import ProductDetail from './ProductDetail'
import OfferEdit from './OfferEdit'
import AddOfferMixins from '@/mixins/AddOfferMixins'
import {toPickerDateString, timeTools, addNumbers} from '../utils/tools'
import xlsx from 'xlsx'
import PaginationController from './PaginationController'

export default {
  name: 'inventoryTenant',
  components: {
    ProductEdit,
    ProductsMerge,
    ProductWidget,
    ProductDetail,
    OfferEdit,
    PaginationController
  },
  mixins: [AddOfferMixins, timeTools],
  data () {
    return {
      menu: false,
      tab: null,
      tabs: [ 'Active', 'Archived' ],
      toastEnable: false,
      toastText: 'invalid UPC',
      toastColor: 'error',
      addProductDialog: false,
      editProductDialog: false,
      productDetailDialog: false,
      productsMergeDialog: false,
      filter: '',
      pagination: {
        sortBy: 'createTime',
        descending: true,
        rowsPerPage: 50
      },
      rowsPerPageItems: [50, 100, {text: 'All', value: -1}],
      productInEdit: {},
      selectedTenant: null,
      archivedProducts: [],
      historyLimit: 50,
      selectedProducts: []
    }
  },
  computed: {
    conditions () {
      return ['new', 'used', 'refurbished']
    },
    products () {
      return this.$store.getters.productsWithUpcChangeableFlag
    },
    upcSet () {
      return new Set(this.products.map(item => item.upc))
    },
    headers () {
      return this.tab === 0 ? [
        { text: 'ID#', value: 'id', align: 'left', sortable: true, width: '5%' },
        { text: 'Product', value: 'name', align: 'left', sortable: false },
        { text: 'UPC', value: 'upc', align: 'left', sortable: false },
        { text: 'Inbound', value: 'inbound', align: 'left', sortable: true },
        { text: 'In-stock', value: 'quantity', align: 'left', sortable: true },
        { text: 'Value', value: 'value', align: 'left', sortable: true },
        { text: 'Action', value: 'onlyForSearch', align: 'center', sortable: false, width: '8%' }
      ] : [
        { text: 'ID#', value: '_key', align: 'left', sortable: true, width: '5%' },
        { text: 'Product', value: 'name', align: 'left', sortable: false },
        { text: 'Archived Time', value: 'lastModifiedTime', align: 'left', sortable: false },
        { text: 'UPC', value: 'upc', align: 'left', sortable: false },
        { text: 'Inbound', value: 'inbound', align: 'left', sortable: true },
        { text: 'Action', value: 'onlyForSearch', align: 'center', sortable: false, width: '8%' }
      ]
    },
    memberType () {
      return this.$store.getters.memberType 
    },
    reportLost () {
      return this.$store.getters.reportLost
    },
    activeProductIdSet () {
      let shipments = this.$store.getters.shipments.map(shipment => {
        let {products} = shipment
        return products.map(product => product.id)
      })

      let transfers = this.$store.getters.productTransfersPending
        .filter(transfer => transfer.from === this.$store.getters.activeOrganization)
        .map(transfer => {
          let {items} = transfer
          return items.map(item => item.id)
        })
      return new Set([...shipments, ...transfers].flat())
    },
    maxProductQty () {
      if (this.$store.getters.tenant.maxProductQty === 0) return 0
      return this.$store.getters.tenant.maxProductQty || 1000
    }
  },
  methods: {
    addNumbers,
    showAddProductDialog () {
      this.productInEdit = {}
      this.addProductDialog = true
    },
    showEditProductDialog (item) {
      let {inbound, quantity, ...productInEdit} = item
      this.productInEdit = productInEdit
      this.editProductDialog = true
    },
    showProductDetail (item) {
      this.productInEdit = {...item}
      this.productDetailDialog = true
    },
    showMergeProductDialog (item) {
      if (item.upc) return this.showToast('"Merging a product with UPC is not allowed"')
      if (item.distribution) {
        let distributionCount = 0
        Object.keys(item.distribution).forEach(key => {
          distributionCount += (key.slice(0, 9) === 'warehouse' ? 1 : 0) 
        })
        if (distributionCount > 0) return this.showToast('Merging a product with warehouse inventory is not allowed')
      }
      if (this.reportLost.some(report => report.productId === item.id)) return this.showToast('"Merging a product with lost report is not allowed"')

      this.productInEdit = {...item}
      this.productsMergeDialog = true
    },
    getWarehouseName (key) {
      let theWarehouse = this.$store.getters.warehousesSites.find((element) => {
        return element.key === key
      })
      return theWarehouse.warehouseName
    },
    showToast (info, level = 'error') {
      this.toastText = info
      this.toastEnable = true
      this.toastColor = level
    },
    addProduct (product) {
      if (this.products.length >= this.maxProductQty) {
        throw Error(`Reach ${this.maxProductQty} active products limit. Please archive old products. If you need to create more than ${this.maxProductQty} products, please contact you account manager.`)
      }
      !product.upc && (product.upc = '')
      product.inbound = 0
      product.quantity = 0
      product.asin && (product.asin = product.asin.map(asin => {
        return asin.trim()
      }))
      product.sku && (product.sku = product.sku.map(sku => {
        return sku.trim()
      }))

      return this.$store.dispatch('addProduct', product)       
        .catch(error => {
          this.showToast('failed to add product', error.message)
        })
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
    },
    mergeProducts (payload) {
      return this.$store.dispatch('mergeProducts', payload)
        .catch(error => {
          this.showToast('failed to merge products', error.message)
          throw error
        })
    },
    exportAllInventory () {
      const filename = `inventory-${toPickerDateString(new Date())}`
      const data = []
      data.push(['ID', 'Name', 'Condition', 'UPC', 'Quantity'])
      this.products.forEach(item => {
        if (item.quantity > 0) {
          data.push([item.id && item.id.slice(-5), item.name, item.condition, item.upc, item.quantity])
        }
      })
      const book = xlsx.utils.book_new()
      const sheet = xlsx.utils.aoa_to_sheet(data)
      xlsx.utils.book_append_sheet(book, sheet, 'sheet1')
      xlsx.writeFile(book, `${filename}.xls`)
    },
    exportSelectedInventory () {
      const filename = `inventory-selected-${toPickerDateString(new Date())}`
      const data = []
      data.push(['ID', 'Name', 'Condition', 'UPC', 'Quantity'])
      this.selectedProducts.forEach(item => {
        if (item.quantity > 0) {
          data.push([item.id && item.id.slice(-5), item.name, item.condition, item.upc, item.quantity])
        }
      })
      const book = xlsx.utils.book_new()
      const sheet = xlsx.utils.aoa_to_sheet(data)
      xlsx.utils.book_append_sheet(book, sheet, 'sheet1')
      xlsx.writeFile(book, `${filename}.xls`)
    },
    archiveSingleProduct (item) {
      if (item.quantity !== 0) return alert(`Product ${item.id.substring(3)}'s in-stock quantity is not 0. Cannot archive product.`)
      if (this.activeProductIdSet.has(item.id)) return alert(`Product ${item.id.substring(3)} has shipments or transfers, Cannot archive product.`)
      if (!confirm('When the product is archived, related active offers and proposed offers will also be removed. Are you sure to archived this product?')) return Promise.resolve()
      return this.$store.dispatch('archiveProduct', item)
    },
    restoreProduct (item) {
      if (!confirm('Are you sure to restore this product?')) return Promise.resolve()
      if (this.products.length >= this.maxProductQty) {
        return alert(`Reach ${this.maxProductQty} active products limit. Please archive old products. If you need to create more than ${this.maxProductQty} products, please contact you account manager.`)
      }
      if (item.upc !== '' && this.upcSet.has(item.upc)) return alert('Find duplicate upc in active products, can not restore.')
      return this.$store.dispatch('restoreProduct', item)
        .then(() => {
          this.archivedProducts = this.archivedProducts.filter(product => product !== item)
        })
    },
    changeSort (column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending
      } else {
        this.pagination.sortBy = column
        this.pagination.descending = false
      }
    },
    batchArchive () {
      if (this.selectedProducts.some(product => product.quantity !== 0)) return alert(`Some of selected products have in-stock quantity, cannot be archived`)
      if (this.selectedProducts.some(product => this.activeProductIdSet.has(product.id))) return alert(`Some of selected products has shipments or transfers, Cannot archive product.`)
      if (!confirm('When selected products are archived, related active offers and proposed offers will also be removed. Are you sure to archived this product?')) return Promise.resolve()
      return Promise.all(this.selectedProducts.map(product => this.$store.dispatch('archiveProduct', product)))
    }
  }
}
</script>
