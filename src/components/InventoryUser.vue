<template>
  <v-container fluid>
    <v-layout justify-space-between>
      <v-flex md3>
        <v-select
          label="Organization name"
          v-model="selectedTenant"
          :items="tenantWorkFor"
          item-text="tenantName"
          return-object></v-select>
      </v-flex>
      <v-spacer></v-spacer>
      <v-flex xs8 md3 lg2>
        <v-text-field
          append-icon="filter_list"
          label="Search"
          single-line
          hide-details
          v-model="filter"
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
      :pagination.sync="pagination"
      :rows-per-page-items="rowPerPage">
      <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>
      <template v-slot:items="props">
        <td class="subheading">{{ props.index + 1}}</td>
        <td class="text-xs-left">{{ selectedTenant.tenantName}}</td>
        <td class="text-xs-left">{{props.item.productCondition}} - {{props.item.productName}}</td>
        <td class="text-xs-left">{{ props.item.upc }}</td>
        <td class="text-xs-left">{{ props.item.quantity }}</td>
        <td class="text-xs-right">
          <v-layout row>
            <v-flex><v-btn dark color="primary" flat @click.stop="showProductDetail(props.item)">Detail</v-btn></v-flex>
          </v-layout>
        </td>
      </template>
    </v-data-table>
    <SimpleTextPopup
      title="Product details"
      v-model="productDetailDialog"
      @popupClose="productDetailDialog = false"
      hideRgtBtn
      medium>
      <template v-slot:input>
        <v-container v-if="selectedProduct">
          <v-layout>
            <v-flex>
              <span class="font-gray font-theme">{{selectedProduct.productCondition}} - </span><span class="font-theme"> {{selectedProduct.productName}}</span>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-spacer></v-spacer>
            <v-flex xs8 md3 lg2>
              <v-text-field
                append-icon="filter_list"
                label="Search"
                single-line
                hide-details
                v-model="dialogFilter"
              ></v-text-field>
          </v-flex>
          </v-layout>
          <v-divider></v-divider>
          <v-layout column>
            <v-data-table
              :headers="detailHeaders"
              :items="productDistribution"
              item-key="key"
              class="elevation-2 myDense"
              :search="dialogFilter"
              :pagination.sync="pagination"
              :rows-per-page-items="rowPerPage">
              <template v-slot:items="props">
                <td class="subheading">{{ props.index + 1}}</td>
                <td class="text-xs-left">{{ props.item.warehouseSite }}</td>
                <td class="text-xs-left">{{ props.item.quantity }}</td>
                <td class="text-xs-center">
                  <v-btn color="primary" @click.stop="showReportMissingDetail(props.item)">Report</v-btn>
                </td>
              </template>
            </v-data-table>
          </v-layout>
        </v-container>
      </template>
    </SimpleTextPopup>
    <FormSubmitPopup
      title="Report missing items"
      v-model="reportMissingDialog"
      v-if="reportMissingDialog"
      @popupClose="reportMissingDialog = false"
      :rightMethod="reportLost"
      rightButtonText="Report"
      medium>
      <template v-slot:input>
        <v-layout>
          <v-text-field
            label="Product"
            prepend-icon="shopping_cart"
            v-model="report.productName"
            disabled
          ></v-text-field>
        </v-layout>
        <v-layout>
          <v-text-field
            label="Quantity"         
            prepend-icon="event"
            :rules="[checkQuantity, fieldIsRequired('Quantity'), fieldIsOverZero('quantity'), fieldIsInteger('Quantity')]"
            class="required_field"
            v-model.number="report.quantity"
          ></v-text-field>
        </v-layout>
        <v-layout>
          <v-text-field
            label="Site"
            prepend-icon="local_shipping"
            v-model="report.warehouseSite"
            disabled
          ></v-text-field>
        </v-layout>
      </template>
    </FormSubmitPopup>
  </v-container>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'inventoryUser',
  components: {
    FormSubmitPopup,
    SimpleTextPopup
  },
  mixins: [checkRules],
  data () {
    return {
      productDetailDialog: false,
      reportMissingDialog: false,
      filter: '',
      dialogFilter: '',
      rowPerPage: [30, 50, 100, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },      
      headers: [
        { text: '#', value: 'id', align: 'left', sortable: false, width: '5%' },
        { text: 'Organization', value: 'tenantName', align: 'left', sortable: false },
        { text: 'Product', value: 'productName', align: 'left', sortable: false },
        { text: 'UPC', value: 'upc', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: true },
        { text: 'Action', value: 'productCondition', align: 'center', sortable: false, width: '8%' }
      ],
      detailHeaders: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'Warehouse Site', value: 'warehouseSite', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Action', value: 'quantity', align: 'center', sortable: false }
      ],
      productInEdit: {},
      selectedTenant: {},
      selectedProduct: {},
      report: {},
      valid: true
    }
  },
  mounted () {
    this.tenantWorkFor && this.tenantWorkFor.length > 0 && (this.selectedTenant = this.tenantWorkFor[0])
  },
  computed: {
    tenantWorkFor () {
      return [...this.$store.getters.tenantWorkFor]
    },
    checkQuantity () {
      return this.report.quantity <= this.selectedProduct.quantity ? true : `Quantity can't exceed product quantity(${this.selectedProduct.quantity}).`
    },
    productDistribution () {
      let productDistribution = this.selectedProduct.distribution ? Object.keys(this.selectedProduct.distribution).map(key => {
        return {distributionKey: key, ...this.selectedProduct.distribution[key]}
      }) : []
      return this.selectedProduct ? productDistribution : []
    },
    products () {
      return this.$store.getters.userInventory.filter(inventory => inventory.tenantKey === this.selectedTenant.tenantKey)
    }
  },
  watch: {
    tenantWorkFor (value) {
      value && value.length > 0 && (this.selectedTenant = value[0])
    }
  },
  methods: {
    showProductDetail (item) {
      this.selectedProduct = item
      this.productDetailDialog = true
    },
    showReportMissingDetail (item) {
      this.report = {...this.selectedProduct, ...item}
      this.reportMissingDialog = true
    },
    reportLost () {
      let {tenantKey, productId, productName, quantity, warehouseSite, productKey, distributionKey} = this.report
      this.$store.dispatch('addLostReport', {tenantKey, productId, productName, quantity, warehouseSite, productKey, distributionKey})
        .then(() => {
          this.selectedProduct.quantity -= quantity
          this.selectedProduct.distribution[distributionKey].quantity -= quantity
        })
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
