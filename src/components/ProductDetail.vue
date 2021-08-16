<template>
  <SimpleTextPopup
    title="Product details"
    v-model="value"
    @popupClose="$emit('input', false)"
    hideRgtBtn
    :outsideScrollToBottom="outsideScrollToBottom"
    large>
    <template v-slot:input>
      <v-container id="add_product">
        <v-layout>
          <v-flex>
            <span class="font-gray font-theme">{{product.condition}}</span><span class="font-theme"> {{product.name}}</span>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <span class="font-green">$ {{product.price}}</span><span class="font-gray"> - {{product.upc}}</span>
          </v-flex>
        </v-layout>
        <v-divider></v-divider>
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
                <v-tab-item v-for="(item, index) in 4" :key="'item' + index">
                  <ProductTable 
                      v-if="index === 0"
                      :product="distribution"
                      :type="index"
                  ></ProductTable>
                    
                  <PaginationController
                    v-if="index === 1 && tab === 1"
                    v-model="confirmedProduct"
                    getDataActionName="getInboundForDetails"
                    :actionPayload="productInboundPayload"
                    :historyLimit="historyLimit"
                    :select="selectedUser"
                    :haveNoEndDate="true"
                    :refresh="refresh"
                    :outsideScrollToBottom="popupToBottom">
                    <template v-slot:dataTable>
                      <v-data-table
                        :headers="headersInbound"
                        :items="confirmedProduct"
                        item-key="packageID"
                        :expand="expand"
                        hide-actions>
                        <template v-slot:items="props">
                          <tr @click="props.expanded = !props.expanded">
                            <td class="subheading">{{ props.index + 1}}</td>
                            <td class="text-xs-left">{{ props.item.userName }}</td>
                            <td class="text-xs-left">{{ props.item.siteName || 'warehouse' }}</td>
                            <td class="text-xs-left">{{ props.item.warehouse === 'self' ? props.item.price + props.item.bonus : props.item.price }}</td>
                            <td class="text-xs-left">{{ props.item.quantity }}</td>
                            <td class="text-xs-left">{{ getDateString(props.item.createTime)}}</td>
                          </tr>
                        </template>
                      </v-data-table>
                    </template>
                    <template
                      v-if="index === 1 && tab === 1 && product.historyProductIds"
                      v-slot:beforeMenu>
                      <v-flex md4>
                        <v-autocomplete
                          v-model="productId"
                          :items="historyProductIds"
                          label="Product history ID"
                          ></v-autocomplete>
                      </v-flex>
                    </template>
                  </PaginationController>
                  <PaginationController
                    v-if="index === 2 && tab === 2"
                    v-model="transferHistory"
                    getDataActionName="getHistoryTransfers"
                    :historyLimit="historyLimit"
                    :haveStartDate="true"
                    :actionPredicates="historyPredicates"
                    :refresh="refresh"
                  >
                    <template v-slot:dataTable>
                      <v-data-table
                        :headers="headerHistory"
                        :items="transfers"
                        class="elevation-2 myDense"
                        hide-actions>
                        <template v-slot:items="props">
                          <td class="text-xs-left">{{ props.item.transactionId }}</td>
                          <td class="text-xs-left">{{ props.item.fromName }}</td>
                          <td class="text-xs-left">{{ props.item.toName }}</td>
                          <td class="text-xs-left">                    
                            <v-layout
                              v-for="(item, index) in props.item.items" 
                              :key="'item' + index">
                              <ProductWidget
                                :name="item.name"
                                :condition="item.condition"
                                :upc="item.upc"
                                :asin="item.asin"
                              ></ProductWidget>
                            </v-layout> 
                          </td>
                          <td class="text-xs-left">
                            ${{ props.item.items[0].unitPrice }}        
                          </td>
                          <td class="text-xs-left">
                            {{ props.item.items[0].toShip}}                 
                          </td>
                          <td class="text-xs-left">{{ props.item.location }}</td>
                          <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                        </template>
                      </v-data-table>
                    </template>
                    <template v-slot:beforeMenu>
                      <v-flex sm8 lg6 d-flex align-baseline>
                        <v-flex sm5>
                          <v-autocomplete
                            v-model="selectedType"
                            :items="types"
                            label="Type"
                            item-text="name"
                            item-value="type"></v-autocomplete>
                        </v-flex>
                        <v-flex sm1></v-flex>
                        <v-flex sm6 v-if="selectedType !== 0">
                          <v-text-field
                            append-icon="filter_list"
                            :label="selectedType === 3 ? 'Transaction ID' : 'Organization name'"
                            v-model="searchName"
                            @keyup.enter="refresh = !refresh"
                          ></v-text-field>
                        </v-flex>
                      </v-flex>
                    </template>
                  </PaginationController>
                  <ProductStatistics
                    v-if="index === 3 && tab === 3"
                    v-model="productId"
                  />
                </v-tab-item>
            </v-tabs-items>
        </v-tabs>
      </v-container>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import ProductTable from './ProductTable'
import ProductWidget from './ProductWidget'
import PaginationController from './PaginationController'
import {toDateString, timeTools} from '../utils/tools'
import ProductStatistics from './ProductStatistics'

export default {
  name: 'productDetail',
  components: {
    SimpleTextPopup,
    ProductTable,
    PaginationController,
    ProductWidget,
    ProductStatistics
  },
  mixins: [timeTools],
  data () {
    return {
      tab: null,
      confirmTaskDialog: false,
      tabs: [
        'In-stock', 'Confirmed', 'Transfers', 'Price history'
      ],
      headersInbound: [
        { text: '#', align: 'left', sortable: false, width: '5%' },
        { text: 'User', value: 'uid', align: 'left', sortable: false },
        { text: 'Site', value: 'siteName', align: 'left', sortable: false },
        { text: 'Price', value: 'price', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Last update', value: 'createTime', align: 'left', sortable: false }
      ],
      headerHistory: [
        { text: 'Transaction ID', value: 'transactionId', align: 'left', sortable: false, width: '5%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Items', value: 'items', align: 'left', sortable: false },
        { text: 'Unit price', value: 'unitPrice', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Location', value: 'location', align: 'left', sortable: false },
        { text: 'Date', value: 'createTime', align: 'left', sortable: false }
      ],
      confirmedProduct: [],
      historyLimit: 20,
      popupToBottom: false,
      selectedUser: '',
      expand: false,
      productId: '',
      productInboundPayload: {},
      transferHistory: [],
      refresh: true,
      types: [{name: '-- All --', type: 0}, {name: 'In', type: 1}, {name: 'Out', type: 2}],
      selectedType: 0,
      searchName: ''
    }
  },
  mounted () {
    this.tab = null
    this.productId = this.product.id || this.product._key
  },
  watch: {
    productId (productId) {
      this.productInboundPayload = { productId }
      this.refresh = !this.refresh
    },
    'selectedType': {
      handler: function (value) {
        this.refresh = !this.refresh
        this.searchName = ''
      },
      immediate: true
    }
  },
  computed: {
    distribution () {
      let distribution = []
      if (this.product.distribution) {
        distribution = Object.keys(this.product.distribution).map(key => { return Object.assign({fbmKey: key}, this.product.distribution[key]) })
      }
      return distribution
    },
    inbound () {
      return this.$store.getters.inbound
    },
    users () {
      let allUsers = this.$store.getters.users
      return [{name: '-- All --', uid: ''}, ...allUsers]
    },
    historyProductIds () {
      return this.product.id ? [this.product.id, ...this.product.historyProductIds] : [this.product._key, ...this.product.historyProductIds]
    },
    transfers () {
      return this.transferHistory.map(item => {
        let transfer = {...item}
        let filteredItems = item.items.filter(ele => ele.upc === this.product.upc)
        transfer.items = filteredItems
        return transfer
      })
    },
    historyPredicates () {
      if (this.selectedType === 0) {
        return [{
          field: 'involvedKeys',
          compare: 'array-contains',
          value: `${this.$store.getters.activeOrganization}_${this.product.upc}`
        }, {
          field: 'isPending',
          compare: '==',
          value: false
        }, {
          field: 'isCanceled',
          compare: '==',
          value: false
        }]
      } else if (this.selectedType === 1) {
        let historyPredicates = [{
          field: `to`,
          compare: '==',
          value: this.$store.getters.activeOrganization
        }, {
          field: 'involvedKeys',
          compare: 'array-contains',
          value: `${this.$store.getters.activeOrganization}_${this.product.upc}`
        }]
        if (this.searchName) {
          historyPredicates.push({
            field: `fromName`,
            compare: '==',
            value: this.searchName.trim()
          })
        }
        return historyPredicates
      } else if (this.selectedType === 2) {
        let historyPredicates = [{
          field: `from`,
          compare: '==',
          value: this.$store.getters.activeOrganization
        }, {
          field: 'involvedKeys',
          compare: 'array-contains',
          value: `${this.$store.getters.activeOrganization}_${this.product.upc}`
        }]
        if (this.searchName) {
          historyPredicates.push({
            field: `toName`,
            compare: '==',
            value: this.searchName.trim()
          })
        }
        return historyPredicates
      }
    }
  },
  methods: {
    getDateString (date) {
      return toDateString(date)
    },
    outsideScrollToBottom (flag) {
      this.popupToBottom = flag
    }
  },
  props: {
    value: Boolean,
    product: Object
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
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
