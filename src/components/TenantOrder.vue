<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <div v-if="index === 0 && tab === 0">
            <v-layout justify-space-between>
              <v-flex xs6 md5>
                <v-layout>
                  <UploadFileWidget
                    v-model="uploadedFiles"
                    ref="fileUploader"
                    type="order"
                    :maxFiles="1"
                    :clearFiles="clearFiles"
                    small
                    :loading="loading"
                    @filesStatus="(status) => status === 'done' && uploadedFiles.length && uploadOrders()"
                    >Upload orders</UploadFileWidget>
                  <v-btn color="primary" :loading="buyShippingDialogRunning" @click="showBuyShippingDialog" :disabled="selectedOrders.length === 0 || buyShippingDialogRunning">
                    Buy shipments({{ selectedOrders.length }})
                  </v-btn>
                  <v-btn color="primary" :loading="buyLabelDialogRunning" @click="showBuyLabelDialog" :disabled="selectedOrders.length === 0 || buyLabelDialogRunning">
                    Buy labels({{ selectedOrders.length }})
                  </v-btn>
                  <v-btn color="primary" @click="batchCancel" :disabled="selectedOrders.length === 0">
                    Delete/Archive selected
                  </v-btn>
                </v-layout>
              </v-flex>
              <v-flex xs4 md3>            
                <v-alert
                  v-model="errorAlert"
                  dismissible
                  outline
                  type="error">{{errorMessage}}</v-alert>
                <v-alert
                  :value="alert"
                  dismissible
                  outline
                  :type="alertType">{{ alertMsg }}</v-alert>
              </v-flex>
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
            <!-- Can be extend to independent component for "select while click row" in the future -->
            <v-layout justify-start>
              <v-flex class="success--text caption" xs2>
                <span class="realtime-border px-1">REAL TIME</span>
              </v-flex>
              <v-flex>Support amazon / eBay / Walmart / Newegg / <a linkify @click="getStandTemplate()">Standard</a></v-flex>
            </v-layout>
            <v-data-table
              v-if="index === 0 && tab === 0"
              :headers="headers"
              :search="filter"
              :items="orders"
              select-all="blue"
              v-model="selectedOrders"
              :pagination.sync="pagination"
              item-key="orderId"
              :rows-per-page-items="rowPerPage"
              :expand="expand">
              <template v-slot:items="props">
                <td class="checkbox-align-center" @click="props.selected = !props.selected">
                  <v-layout>
                    <v-checkbox
                      @click.stop="() => { props.selected = !props.selected }"
                      :value="props.selected"
                      primary
                      hide-details
                    ></v-checkbox>
                  </v-layout>
                </td>
                <td class="text-xs-left">{{ toTimestampString(props.item.purchaseDate) }}</td>
                <td class="text-xs-left">
                  <OrderDetail
                    :orderId="props.item.orderId"
                    :platform="props.item.platform"
                    :messages="props.item.messages"
                  />
                </td>
                <td class="text-xs-left">
                  <v-flex 
                    row
                    v-for="(item, index) in props.item.items" 
                    :key="'item' + index"
                  >
                    <ProductWidget
                      :name="item.productName"
                      :sku="[item.sku]"
                      :quantityShipped="item.quantityShipped"
                      :quantityPurchased="item.quantityPurchased"
                    >
                      <template v-slot:sku>
                        <span class="ml-2"><a @click="() => { filter = item.sku }">{{item.sku}}</a></span>
                      </template>
                    </ProductWidget>

                    <v-layout>
                      <v-flex class="text-sm-left">Ship by: {{ toDateString(props.item.promiseDate) }}</v-flex>
                    </v-layout>
                  </v-flex> 
                </td>
                <td class="text-xs-left">
                  <v-layout>
                    <strong>{{props.item.buyerName}}</strong>
                  </v-layout>
                  <v-layout>
                    {{props.item.recipientName}}
                  </v-layout>
                  <v-layout>
                    {{ props.item.shipAddress1 + props.item.shipAddress2 }}
                  </v-layout>
                  <v-layout>
                    {{ props.item.shipCity }} - {{ props.item.shipState }} - {{ props.item.shipPostalCode }}
                  </v-layout>
                  <v-layout>
                    {{props.item.buyerPhoneNumber}}
                  </v-layout>
                </td>
                <td class="text-xs-left">
                  <v-layout>
                    {{ props.item.shipServiceLevel }} / {{props.item.isBusinessOrder ? 'Business' : 'Other'}}
                  </v-layout>
                </td>
                <td class="text-xs-center" v-if="templates.find(template => props.item.items.length === 1 && props.item.items.some(item => item.sku === template.sku))">{{ 
                  templates.find(template => props.item.items.some(item => item.sku === template.sku)).name
                }}</td>
                <td class="text-xs-center" v-else-if="props.item.items.length === 1">
                  <v-btn @click.stop="showTemplateDialog(props.item)" dark flat icon color="primary">
                    <v-icon>add</v-icon>
                  </v-btn>
                </td>
                <td class="text-xs-left" v-else>
                  
                </td>
                <td class="text-xs-center">
                  <v-layout justify-center no-wrap>
                    <v-btn @click="showAddShipmentSingle(props.item)" dark flat icon color="primary">
                      <v-icon>local_shipping</v-icon>
                    </v-btn>
                    <v-btn icon flat dark color="primary" @click="archiveOrder(props.item)" v-if="props.item.items.some(item => item.quantityShipped > 0)">
                      <v-icon>archive</v-icon>
                    </v-btn>
                    <v-btn icon flat dark color="primary" @click="deleteOrder(props.item)" v-else>
                      <v-icon>delete</v-icon>
                    </v-btn>
                  </v-layout>
                </td>
              </template>
            </v-data-table>
          </div>
          <PaginationController
            v-if="index === 1 && tab === 1"
            v-model="historyOrders"
            getDataActionName="getHistoryOrdersPagination"
            haveStartDate
            :refresh="searchOrderHistoryRefresh"
            startDateLabel="Process start date"
            searchBoxLabel="Order id / sku"
            :historyLimit="historyLimit"
            :actionPredicates="[
              {field: 'keywords', compare: 'array-contains', value: (platform || searchOrderHistory || selectWord || '').toLowerCase()}
            ]"
          >
            <template v-slot:beforeMenu>
              <v-layout row nowrap>
                <v-flex md3 mr-1>
                  <v-select
                    :items="[
                      {name: 'Keyword', value: 'keyword'},
                      {name: 'Platform', value: 'platform'},
                      {name: 'Label', value: 'label'},
                      {name: 'Shipment', value: 'shipping'}
                    ]"
                    item-value="value"
                    item-text="name"
                    v-model="orderHistoryMode"
                    @change="(e) => {
                      platform = ''
                      searchOrderHistory =''
                      if (e === 'label' || e === 'shipping') {
                        selectWord = e
                      } else {
                        selectWord = ''
                      }
                    }"
                    label="Search Mode"
                  ></v-select>
                </v-flex>
                <v-flex v-if="orderHistoryMode === 'keyword'" md4>
                  <v-text-field
                    label="Order id / sku"
                    v-model="searchOrderHistory"
                    @keyup.enter="() => {searchOrderHistoryRefresh = !searchOrderHistoryRefresh}"
                    clearable
                  />
                </v-flex>
                <v-flex v-if="orderHistoryMode === 'platform'" md4>
                  <v-autocomplete 
                    :items="platforms"
                    item-value="value"
                    item-text="name"
                    v-model="platform"
                    label="Platform"
                  />
                </v-flex>
              </v-layout>
            </template>
            <template v-slot:afterDate>
              <v-flex xs3>
                <v-btn small color="primary" @click="exportOrdersShippingConfirm" :disabled="selectedHistoryOrders.length === 0">
                  Export orders({{ selectedHistoryOrders.length }})
                </v-btn>
              </v-flex>
              <v-flex xs3>
                <v-switch :label="isMergePDF ? 'PDF' : 'ZIP'" v-model="isMergePDF"></v-switch>
              </v-flex>
              <v-flex xs3>
                <LoaderButton
                  isSmall
                  :buttonText="`Download labels(${selectedHistoryOrders.length})`"
                  :promiseAwait="downloadSelectedOrderLabels"
                  :disabled="selectedHistoryOrders.length === 0"/>
              </v-flex>
            </template>
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="historyOrders"
                hide-actions
                item-key="orderId"
                v-model="selectedHistoryOrders"
                select-all="blue"
                :expand="expand"
              >
                <template v-slot:items="props">
                  <td class="checkbox-align-center" @click="props.selected = !props.selected">
                    <v-layout>
                      <v-checkbox
                        @click.stop="() => { props.selected = !props.selected }"
                        :value="props.selected"
                        primary
                        hide-details
                      ></v-checkbox>
                    </v-layout>
                  </td>
                    <td class="text-xs-left">
                      <OrderDetail
                        :orderId="props.item.orderId"
                        :platform="props.item.platform"
                        :messages="props.item.messages||[]"
                      />
                      <v-layout justify-start wrap align-start>
                        <span>Order date: {{ toTimestampString(props.item.purchaseDate) }}</span>
                      </v-layout>
                      <v-layout justify-start wrap align-start>
                        <span>Process date: {{ toTimestampString(props.item.processTime) }}</span>
                      </v-layout>
                    </td>
                    <td class="text-xs-left">
                      <v-flex 
                        row
                        v-for="(item, index) in props.item.items" 
                        :key="'item' + index"
                      >
                        <ProductWidget
                          :name="item.productName"
                          :sku="[item.sku]"
                          :quantityShipped="item.quantityShipped"
                          :quantityPurchased="item.quantityPurchased"/>
                      </v-flex> 
                    </td>
                    <td class="text-xs-left">
                      <v-layout>
                        <strong>{{props.item.buyerName}}</strong>
                      </v-layout>
                      <v-layout>
                        {{props.item.recipientName}}
                      </v-layout>
                      <v-layout>
                        {{ props.item.shipAddress1 + props.item.shipAddress2 }}
                      </v-layout>
                      <v-layout>
                        {{ props.item.shipCity }} - {{ props.item.shipState }} - {{ props.item.shipPostalCode }}
                      </v-layout>
                      <v-layout>
                        {{props.item.buyerPhoneNumber}}
                      </v-layout>
                    </td>
                    <td class="text-xs-left">
                      <v-layout>
                        {{ props.item.shipServiceLevel }} / {{props.item.isBusinessOrder ? 'Business' : 'Other'}}
                      </v-layout>
                    </td>
                    <td class="text-xs-left">
                      <v-layout wrap>
                        <v-flex v-for="shipment in props.item.shipments" :key="shipment.key || shipment.labelKey">
                          <LabelTrackingDetailWidget
                            :trackingNumber="getShipmentTracking(shipment) !== 'No tracking' ? getShipmentTracking(shipment) : ''"
                            :status="getOrderTrackingDetail(props.item, (shipment.trackingNumber || '').trim()).status"
                            :carrier="getOrderTrackingDetail(props.item, (shipment.trackingNumber || '').trim()).carrier"
                            :details="getOrderTrackingDetail(props.item, (shipment.trackingNumber || '').trim()).trackingDetails"
                          >
                            <span v-if="shipment.key">
                              <strong>{{shipment.key}}</strong> - {{getShipmentTracking(shipment)}} - {{shipment.status}}
                            </span>
                          </LabelTrackingDetailWidget>
                          
                        </v-flex>
                      </v-layout>
                    </td>
                </template>
              </v-data-table>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <OrderAddShipment
      v-model="showAddShipmentDialog" 
      v-if="showAddShipmentDialog"
      :selectedOrder="selectedOrder"
      :template="selectedTemplate"/>
    <BuyShippingPopup
      v-model="buyShippingDialog" 
      v-if="buyShippingDialog"
      :selectedOrders.sync="selectedOrders"
      @submitted="clearSelectedOrders"/>
    <BuyLabelPopup
      v-model="buyLabelDialog" 
      v-if="buyLabelDialog"
      :selectedOrders.sync="selectedOrders"
      @submitted="clearSelectedOrders"/>
    <LabelTemplatePopup
      v-model="createTemplateDialog" 
      v-if="createTemplateDialog"
      :initTemplate="templateInEdit"/>
  </v-container>
</template>

<script>

import LoaderButton from './LoaderButton'
import PaginationController from './PaginationController'
import UploadFileWidget from './UploadFileWidget'
import {timeTools} from '../utils/tools'
import OrderAddShipment from './OrderAddShipment'
import ProductWidget from './ProductWidget'
import OrderDetail from './OrderDetail'
import BuyShippingPopup from './BuyShippingPopup'
import BuyLabelPopup from './BuyLabelPopup'
import LabelTemplatePopup from './LabelTemplatePopup'
import LabelTrackingDetailWidget from './LabelTrackingDetailWidget'
import { getFileUrl } from '@/utils/dbAccessor'

export default {
  name: 'TenantOrder',
  components: {
    LoaderButton,
    PaginationController,
    UploadFileWidget,
    OrderAddShipment,
    ProductWidget,
    OrderDetail,
    BuyShippingPopup,
    LabelTemplatePopup,
    BuyLabelPopup,
    LabelTrackingDetailWidget
  },
  data () {
    return {
      tab: 0,
      tabs: [
        'Active', 'History'
      ],
      filter: '',
      pagination: {
        sortBy: ''
      },
      rowPerPage: [20, 50, 100, {text: 'All', value: -1}],
      archivedShipments: [],
      historyLimit: 25,
      rawOrders: '',
      uploadedFiles: [],
      displayDetail: false,
      removeAfterCancel: true,
      clearFiles: false,
      selectedOrders: [],
      selectedOrder: {},
      showAddShipmentDialog: false,
      historyOrders: [],
      expand: false,
      buyShippingDialog: false,
      buyLabelDialog: false,
      loading: false,
      alert: false,
      alertType: 'success',
      alertMsg: '',
      createTemplateDialog: false,
      templateInEdit: {},
      platforms: [
        { name: '-- All --', value: '' },
        { name: 'Amazon', value: 'Amazon' }, 
        { name: 'eBay', value: 'eBay' },
        { name: 'Walmart', value: 'walmart' },
        { name: 'Newegg', value: 'newegg' },
        { name: 'Customize', value: 'customize' }
      ],
      platform: '',
      searchOrderHistory: '',
      searchOrderHistoryRefresh: false,
      orderHistoryMode: 'keyword',
      selectWord: '',
      selectedTemplate: {},
      selectedHistoryOrders: [],
      buyLabelDialogRunning: false,
      buyShippingDialogRunning: false,
      isMergePDF: false
    }
  },
  mixins: [timeTools],
  computed: {
    orders () {
      return this.$store.getters.orders
    },
    headers () {
      if (this.tab === 0) {
        return [
          // { sortable: false },
          { text: 'Order date', value: 'orderId', align: 'left', sortable: true, width: '10%' },
          { text: 'Order detail', value: 'sku', align: 'left', sortable: false, width: '15%' },
          { text: 'Product Info', value: 'isExpedited', align: 'left', sortable: false },
          { text: 'Buyer Info', value: 'isExpedited', align: 'left', sortable: false },
          { text: 'Service level/Address type', value: 'keywordsForSearch', align: 'left', sortable: false },
          { text: 'Template', value: 'templateName', align: 'left', sortable: false },
          { text: 'Action', value: 'products[0].upc', align: 'center', sortable: false, width: '10%' }
        ]
      }

      return [
        { text: 'Order detail', value: 'sku', align: 'left', sortable: false, width: '15%' },
        { text: 'Product Info', value: 'isExpedited', align: 'left', sortable: false },
        { text: 'Buyer Info', value: 'isExpedited', align: 'left', sortable: false },
        { text: 'Service level/Address type', value: 'keywordsForSearch', align: 'left', sortable: false },
        { text: 'Shipment', value: 'shipments', align: 'left', sortable: false }
      ]
    },
    skuToProductIdMap () {
      return this.$store.getters.skuToProductIdMap
    },
    shipmentToTrackingMap () {
      return this.$store.getters.shipmentToTrackingMap
    },
    hasSameProductId () {
      let set = new Set()
      this.selectedOrders.forEach(order => {
        let productId = this.skuToProductIdMap.get(order.sku)
        if (set.has(productId)) {
          return true
        }
        set.add(productId)
      })
      return false
    },
    isFromSameOrder () {
      let set = new Set()
      this.selectedOrders.forEach(order => {
        set.add(order.orderId)
        if (set.size > 1) return false
      })
      return true
    },
    hasUnknownSku () {
      let set = new Set()
      this.selectedOrders.forEach(order => {
        let productId = this.skuToProductIdMap.get(order.sku)
        if (set.has(productId)) {
          return true
        }
        set.add(productId)
      })
      return false
    },
    errorAlert () {
      return !this.isFromSameOrder || this.hasSameProductId
    },
    errorMessage () {
      if (this.errorAlert) {
        if (!this.isFromSameOrder) {
          return 'Warning: selected orders from different orders.'
        }
        return 'Warning: selected orders from same product id.'
      }
      return ''
    },
    templates () {
      return this.$store.getters.templates
    }
  },
  mounted () {
    this.isMergePDF = window.localStorage.getItem('isMergePDF') === 'true'
  },
  watch: {
    isMergePDF (val) {
      window.localStorage.setItem('isMergePDF', val)
    },
    tab () {
      this.selectedOrders = []
      this.selectedHistoryOrders = []
    },
    filter () {
      this.selectedOrders = []
    }
  },
  methods: {
    showTemplateDialog (item) {
      this.createTemplateDialog = true
      this.templateInEdit = {sku: item.items[0].sku}
    },
    uploadOrders () {
      this.loading = true
      this.alert = false
      this.alertType = 'success'
      this.alertMsg = ''
      if (!this.uploadedFiles.length) return Promise.resolve()
      return this.$store.dispatch('uploadOrders', {files: this.uploadedFiles})
        .then((rtn) => {
          this.alert = true
          let errorFiles = rtn.data.filter(item => item.qty !== 0 && !item.qty)
          let orderQty = rtn.data.reduce((acc, item) => {
            if (item.qty) {
              return acc + item.qty
            }
            return acc
          }, 0)
          if (errorFiles.length > 0) {
            this.alertType = 'error'
            this.alertMsg = `Upload ${errorFiles} failed.`
          } else {
            this.alertType = 'success'
            this.alertMsg = `Upload success. ${orderQty} new orders from ${rtn.data[0].platform}.`
          }
        })
        .catch((error) => {
          this.alert = true
          this.alertType = 'error'
          this.alertMsg = error.message
        })
        .finally(() => {
          this.loading = false
          this.clearFiles = !this.clearFiles
        })
    },
    deleteOrder (item) {
      if (!confirm('Are you sure to delete this order?')) return Promise.resolve()
      return this.$store.dispatch('deleteOrders', {orders: [item]})
    },
    batchCancel () {
      if (!confirm('Are you sure to delete/archive these orders?')) return Promise.resolve()
      const promises = [
        this.$store.dispatch('deleteOrders', {orders: this.selectedOrders.filter(order => !order.items.some(item => item.quantityShipped > 0))}),
        ...this.selectedOrders
          .filter(order => order.items.some(item => item.quantityShipped > 0))
          .map(order => this.$store.dispatch('archiveOrder', order))
      ]
      return Promise.all(promises)
    },
    archiveOrder (item) {
      if (!confirm('Are you sure to archive this orders?')) return Promise.resolve()
      return this.$store.dispatch('archiveOrder', item)
    },
    cancelDetail (item) {
      this.displayDetail = false
      if (this.removeAfterCancel) {
        this.$store.dispatch('cancelErrorMsg', item)
      }
    },
    toggleAll () {
      if (this.selectedOrders.length) this.selectedOrders = []
      else this.selectedOrders = this.orders.slice()
    },
    changeSort (column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending
      } else {
        this.pagination.sortBy = column
        this.pagination.descending = false
      }
    },
    showAddShipmentSingle (item) {
      this.selectedOrder = item
      this.showAddShipmentDialog = true
      this.selectedTemplate = this.templates.find(template => item.items.some(obj => obj.sku === template.sku))
    },
    delayExec (flag, excutor) {
      this[flag] = true
      setTimeout(() => { this[flag] = false }, 500 + this.selectedOrders.length * 150)
      setTimeout(() => excutor(), 200)
    },
    showBuyShippingDialog () {
      this.delayExec('buyShippingDialogRunning', () => {
        if (this.selectedOrders.length > 20) return alert('Only support maximum 20 orders.')
        this.selectedOrders = this.selectedOrders.filter(order => order.items.length === 1)
        this.buyShippingDialog = true 
      })
    },
    showBuyLabelDialog () {
      this.delayExec('buyLabelDialogRunning', () => {
        if (this.selectedOrders.length > 20) return alert('Only support maximum 20 orders.')
        this.buyLabelDialog = true 
      })
    },
    exportOrdersShippingConfirm () {
      return this.$store.dispatch('exportOrderShippingsConfirmFiles', this.selectedHistoryOrders)
    },
    downloadSelectedOrderLabels () {
      return this.$store.dispatch('downloadSelectedOrderLabels', {
        orders: this.selectedHistoryOrders,
        isMergePDF: this.isMergePDF
      })
    },
    getShipmentTracking (shipment) {
      const {key, trackingNumber} = shipment
      return trackingNumber || 
        (this.$store.getters.shipments.find(({_key}) => _key === key) || {}).trackingNum ||
        'No tracking'
    },
    clearSelectedOrders () {
      this.selectedOrders = []
    },
    getOrderTrackingDetail (order, trackingNumber) {
      if (!trackingNumber || trackingNumber === 'No tracking') return {status: 'error', carrier: '', trackingDetails: []}
      return order.trackingDetailMap ? 
        (order.trackingDetailMap[trackingNumber] || {status: 'error', carrier: '', trackingDetails: []}) : 
        { status: 'error', carrier: '', trackingDetails: [] }
    },
    getStandTemplate () {
      return getFileUrl('templates/orders-Customize-template-200430.xlsx')
        .then(url => window.open(url))
    }
  }
}
</script>

<style>
.checkbox-align-center .v-messages {
  min-height: 0px;
}

.checkbox-align-center .v-input--selection-controls:not(.v-input--hide-details) .v-input__slot {
  margin-bottom: 0px;
}
</style>
