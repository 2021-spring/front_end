<template>
  <v-container fluid>
    <v-layout justify-space-between align-baseline>
      <v-flex xs7 md6 lg5 xl4>
        <v-layout justify-start align-end>
          <v-flex xs5>
            <v-select
              label="Site name"
              v-model="selectedSite"
              :items="warehousesSites"
              item-text="siteName"
              return-object></v-select>
          </v-flex>
          <v-flex xs1></v-flex>
          <v-flex xs5>
            <SelectWidget
              label="Organizaitons"
              :items="organizations"
              v-model="selectedTenant"
              chipText='organizationId'
              itemText="displayName"
              itemValue="key"/>
          </v-flex>
        </v-layout>
      </v-flex>
      <v-flex><v-btn color="primary" @click.stop="getWarehouseInventory" :disabled="loading">Search</v-btn></v-flex>
      <v-flex>
        <v-btn 
          color="primary" 
          @click.stop="showAdjustInventoryDialog"
          v-if="hasAuthToFunctionality('adjustInventory')">Adjust</v-btn>
      </v-flex>
      <v-flex><v-btn color="primary" @click.stop="showAdjustHistoryDialog">Change log</v-btn></v-flex>
      <v-spacer></v-spacer>
      <v-flex xs4 md2 xl1>
        <v-text-field
          append-icon="filter_list"
          label="Search"
          single-line
          hide-details
          v-model="filter"
          @keyup.enter="filterEnter"
          clearable
        ></v-text-field>
      </v-flex>
    </v-layout>
    <v-data-table
      :headers="headers"
      :items="products"
      class="elevation-2 myDense"
      ref="inventoryTable"
      :search="filter"
      :loading="loading"
      :pagination.sync="pagination"
      :rows-per-page-items="rowPerPage"
    >
      <template v-slot:progress>
        <v-progress-linear color="blue" indeterminate></v-progress-linear>
      </template>
      <template v-slot:headerCell="props">
        {{ props.header.text }}
        <template v-if="props.header.value === 'quantity'">
          ({{filteredItems.reduce((acc, item) => item.quantity + acc, 0)}})
        </template>
        <template v-if="props.header.value === 'abnormalQty'">
          ({{filteredItems.reduce((acc, item) => item.abnormalQty + acc, 0)}})
        </template>
      </template>
      <template v-slot:items="props">
        <td class="subheading">{{ props.index + 1}}</td>
        <td class="text-xs-left">{{ props.item.upc }}</td>
        <td class="text-xs-left">{{props.item.productName}}</td>
        <td class="text-xs-left">
          <template v-for="(item, index) in props.item.distribution">
            <v-tooltip top :key="item[0]" v-if="index <= expandTo[props.index]">
              <template v-slot:activator="{ on }">
                <v-chip small v-on="on">
                  <span>{{ (organizations.find(org => org.key === item[0]))['organizationId'] }}</span>
                </v-chip>
              </template>
              <span>
                <span style="display:block" v-if="item[1].quantity">Normal: {{ item[1].quantity }} </span> 
                <span style="display:block" v-if="item[1].abnormalQty">abnormal: {{ item[1].abnormalQty}}</span>
              </span>
            </v-tooltip>
            <span
              :key="item[0]"
              v-if="index === expandTo[props.index] + 1"
              class="grey--text caption"
              @click="expandChips(props.index)"
            >
              (+{{ props.item.distribution.length - 1 - expandTo[props.index] }} others) Click to Expand
            </span>
          </template>
        </td>
        <td class="text-xs-left" style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{ props.item.location && props.item.location.join(', ') }}</td>
        <td class="text-xs-left">{{ props.item.quantity || '' }}</td>
        <td class="text-xs-left">{{ props.item.abnormalQty || '' }}</td>
        <td class="text-xs-center">
          <v-tooltip top>
            <template v-slot:activator="tooltip">
              <div v-on="tooltip.on">
                <v-btn dark color="primary" icon flat @click.stop="showEditLocationDialog(props.item)"><v-icon>edit</v-icon></v-btn>
              </div>
            </template>
            Edit location
          </v-tooltip>
        </td>
      </template>
    </v-data-table>
    <SimpleTextPopup
      title="Report missing items"
      v-model="reportMissingDialog"
      @popupClose="reportMissingDialog = false"
      :rightMethod="reportLost"
      rightButtonText="Report"
      :rightButtonDisabled="!valid"
      medium>
      <template v-slot:input>
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-layout>
            <v-text-field
              label="Product"
              prepend-icon="shopping_cart"
              v-model="report.productName"
              readonly
            ></v-text-field>
          </v-layout>
          <v-layout>
            <v-text-field
              label="Quantity"         
              prepend-icon="event"
              :rules="[fieldIsRequired('quantity'), fieldIsInteger('quantity'), fieldIsNoLessThanZero('quantity')]"
              autofocus
              class="required_field"
              v-model.number="report.quantity"
            ></v-text-field>
          </v-layout>
          <v-layout>
            <v-text-field
              label="Site"
              prepend-icon="local_shipping"
              v-model="report.warehouseSite"
              readonly
            ></v-text-field>
          </v-layout>
        </v-form>
      </template>
    </SimpleTextPopup>
    <FormSubmitPopup
      title="Edit location"
      v-model="editLocationDialog"
      :rightMethod="editLocation"
      @popupClose="() => { editLocationDialog = false }"
      small
    >
      <template v-slot:input>
        <v-layout>
          <v-flex>
            <v-text-field
              label="UPC"
              class="required_field"
              readonly
              v-model="upcInEdit.upc"></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-combobox
              v-model="upcInEdit.location"
              chips
              multiple
              deletable-chips
              clearable></v-combobox>
          </v-flex>
        </v-layout>
      </template>
    </FormSubmitPopup>
    <WarehouseAdjustInventory
      v-model="adjustInventoryDialog" 
      v-if="adjustInventoryDialog"
      :actionAfterSubmit="getWarehouseInventory"/>
    <WarehouseAdjustLogs
      v-model="adjustHistoryDialog" 
      v-if="adjustHistoryDialog"/>
  </v-container>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import FormSubmitPopup from './FormSubmitPopup'
import SelectWidget from './SelectWidget'
import { checkRules, mediaTools, deepEqual } from '@/utils/tools'
import WarehouseAdjustInventory from './WarehouseAdjustInventory'
import WarehouseAdjustLogs from './WarehouseAdjustLogs'

export default {
  name: 'inventoryWarehouse',
  components: {
    SimpleTextPopup,
    SelectWidget,
    WarehouseAdjustInventory,
    WarehouseAdjustLogs,
    FormSubmitPopup
  },
  mixins: [checkRules, mediaTools],
  data () {
    return {
      reportMissingDialog: false,
      filter: '',
      rowPerPage: [30, 50, 100, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      loading: false,  
      selectedTenant: [],
      selectedSite: null,
      products: [],
      selectedProduct: null,
      report: {},
      valid: true,
      expandTo: [],
      adjustInventoryDialog: false,
      adjustHistoryDialog: false,
      editLocationDialog: false,
      upcInEdit: {},
      filteredItems: [],
      initLocation: []
    }
  },
  mounted () {
    // this.organizations && this.organizations.length > 0 && (this.selectedTenant = this.organizations[0])
    this.warehousesSites && this.warehousesSites.length > 0 && (this.selectedSite = this.warehousesSites[0])
    this.$watch(() => this.$refs.inventoryTable.filteredItems, (newValue, oldValue) => { this.filteredItems = newValue })
  },
  computed: {
    warehousesSites () {
      return this.$store.getters.warehousesSites
    },
    organizations () {
      return [...this.$store.getters.sortedWarehouseOrganizations]
    },
    checkQuantity () {
      return true
    },
    headers () {
      return [
        { text: '#', value: 'id', align: 'left', sortable: false, width: '5%' },
        { text: 'UPC', value: 'upc', align: 'left', sortable: false },
        { text: 'Product', value: 'productName', align: 'left', sortable: false },
        { text: 'Distribution', value: 'productName', align: 'left' },
        { text: 'Location', value: 'location', align: 'left' },
        { text: `Normal`, value: 'quantity', align: 'left', sortable: true },
        { text: `Abnormal`, value: 'abnormalQty', align: 'left', sortable: true },
        { text: 'Action', value: '', align: 'center' }
      ]
    },
    upcMap () {
      return this.$store.getters.upcMap
    }
  },
  methods: {
    showAdjustHistoryDialog () {
      this.adjustHistoryDialog = true
    },
    showEditLocationDialog (item) {
      this.editLocationDialog = true
      this.upcInEdit = {...item}
      this.initLocation = [...item.location]
    },
    filterEnter (event) {
      event.target.select()
      this.hintSound()()
    },
    editLocation () {
      if (!deepEqual(this.upcMap[this.upcInEdit.upc].location, this.initLocation)) {
        if (!confirm('The location has already been changed, do you want to overwrite?')) {
          let target = this.products.find(item => item.upc === this.upcInEdit.upc)
          target.location = this.upcMap[this.upcInEdit.upc].location
          return Promise.resolve('keepPopup')
        } 
      }

      const location = this.upcInEdit.location || []
      return this.$store.dispatch('updateUpc', {
        key: this.upcMap[this.upcInEdit.upc].key,
        location
      })
        .then(() => {
          let target = this.products.find(item => item.upc === this.upcInEdit.upc)
          target.location = location
        })
    },
    showAdjustInventoryDialog () {
      this.adjustInventoryDialog = true
    },
    getWarehouseInventory () {
      this.expandTo = 0
      this.products = []
      if (this.selectedTenant && this.selectedSite) {
        this.loading = true
        return this.$store.dispatch('getWarehouseInventory', {siteKey: this.selectedSite.key, tenantKeys: this.selectedTenant, isAll: this.selectedTenant.length === this.organizations.length})
          .then(products => { 
            this.expandTo = products.map(() => 4)
            this.products = products.map(product => {
              if (product.distribution) {
                product.distribution = this.distSort(product.distribution)
              }
              if (this.upcMap[product.upc]) {
                product.location = this.upcMap[product.upc].location || ''
              } else {
                console.log('UPC ', product.upc, ' is missing')
              }
              
              return product
            })
            this.loading = false
          })
          .catch((err) => {
            this.loading = false
            console.error(err)
          })
      }
    },
    showReportMissingDetail (item) {
      this.report = {...this.selectedProduct, ...item}
      this.reportMissingDialog = true
    },
    reportLost () {
      // let {tenantKey, productId, productName, quantity, warehouseSite, productKey, distributionKey} = this.report
      // this.$store.dispatch('addLostReport', {tenantKey, productId, productName, quantity, warehouseSite, productKey, distributionKey})
      //   .then(() => {
      //     this.selectedProduct.quantity -= quantity
      //     this.selectedProduct.distribution[distributionKey].quantity -= quantity
      //   })
    },
    expandChips (index) {
      this.$set(this.expandTo, index, 9999)
    },
    distSort (distribution) {
      return Object.keys(distribution).map(key => [key, distribution[key]]).sort((a, b) => a.quantity - b.quantity)       
    }
  }
}
</script>

<style>
.font-gray {
    color: gray;
    font-size: 15px;
}
.font-green {
    color: green;
    font-size: 15px;
}
.font-theme {
    font-size: 21px;
    font-weight: bold;
}
</style>
