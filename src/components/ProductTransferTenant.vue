<template>
  <v-container fluid>
    <v-layout v-if="isOrganization">
      <v-flex>
        <v-btn dark color="primary" @click.stop="showAddTransferDialog"><v-icon dark>add</v-icon>Transfer</v-btn>
      </v-flex>
    </v-layout>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="(tabItem, index) in tabs" :key="tabItem">
          <v-badge class="notification" :value="showBadge(index)" color="red">
            <template v-slot:badge>
              <div dark></div>
            </template>
            <span class="tabItem">
              {{ tabItem }}
            </span>
          </v-badge>
        </v-tab>
      <v-spacer></v-spacer>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 2" :key="'item' + index">
          <PaginationController
            v-if="tabs[index] === 'History' && tabs[tab] === 'History'"
            v-model="transferHistory"
            getDataActionName="getHistoryTransfers"
            :historyLimit="historyLimit"
            :haveStartDate="true"
            :actionPredicates="historyPredicates"
            :refresh="refresh">
            <template v-slot:dataTable>
              <v-data-table
                :headers="headerHistory"
                :items="transferHistory"
                class="elevation-2 myDense"
                hide-actions>
                <template v-slot:items="props">
                  <td class="text-xs-left">{{ props.item.transactionId }}</td>
                  <td :class="selectedType === 2 ? 'text-xs-left font-green' : 'text-xs-left'">{{ props.item.fromName }}</td>
                  <td :class="selectedType === 1 ? 'text-xs-left font-green' : 'text-xs-left'">{{ props.item.toName }}</td>
                  <td class="text-xs-left">                    
                    <v-flex
                      v-for="(item, index) in props.item.items" 
                      :key="'item' + index"
                      row>
                      <ProductWidget
                        :name="item.name"
                        :condition="item.condition"
                        :upc="item.upc"
                      >
                        <template v-slot:info>
                          <v-flex class="text-xs-right" style="white-space: nowrap">${{ (item.unitPrice || 0).toLocaleString() }} * {{ item.toShip }}</v-flex>
                        </template>
                      </ProductWidget>
                    </v-flex>
                    <v-layout>
                      <v-flex :class="noteClass">{{props.item.note}}</v-flex>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">                    
                    ${{ props.item.items.reduce((acc, item) => acc + (item.unitPrice || 0) * item.toShip, 0).toLocaleString() }}
                  </td>
                  <td class="text-xs-left">
                    <v-layout>
                      {{ props.item.warehouseName }}
                    </v-layout>
                    <v-layout>
                      {{ props.item.location }}
                    </v-layout>
                  </td>
                  <td class="text-xs-left">{{ props.item.userName }}</td>
                  <td class="text-xs-left">{{ props.item.isCanceled ? 'Canceled' : props.item.isPending ? 'Pending' : 'Added' }}</td>
                  <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
                  <td class="text-xs-center">
                    <v-flex v-if="props.item.files"><v-btn color="primary" flat @click.stop="downloadFile(props.item.files)" :disabled="!props.item.files.length">Attachment</v-btn></v-flex>
                  </td>
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
                <v-flex sm6 v-if="selectedType >= 1 && selectedType <= 3">
                  <v-text-field
                    append-icon="filter_list"
                    :label="selectedType === 3 ? 'Transaction ID' : 'Organization name'"
                    v-model="searchName"
                    @keyup.enter="refresh = !refresh"
                  ></v-text-field>
                </v-flex>
                <v-flex sm6 v-if="selectedType === 4">
                  <v-select
                    :items="organizationsForSelect"
                    item-text="displayName"
                    item-value="key"
                    v-model="organizationKey"
                    label="Organization ID"
                  ></v-select>
                </v-flex>
              </v-flex>
            </template>
          </PaginationController>
          <v-layout v-if="tabs[index] === 'Pending' && tabs[tab] === 'Pending'" justify-start align-baseline>
            <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
          </v-layout>
          <v-data-table
            v-if="tabs[index] === 'Pending' && tabs[tab] === 'Pending'"
            :headers="headerPending"
            :items="pendingTransfers"
            item-key="_key"
            class="elevation-2 myDense"
            :rows-per-page-items="rowPerPage">
            <template v-slot:items="props">
              <td class="text-xs-left">{{ props.item.transactionId }}</td>
              <td class="text-xs-left">{{ props.item.fromName }}</td>
              <td class="text-xs-left">{{ props.item.toName }}</td>
              <td class="text-xs-left">                    
                <v-flex
                  v-for="(item, index) in props.item.items"
                  row
                  :key="'item' + index">
                  <ProductWidget
                    :name="item.name"
                    :condition="item.condition"
                    :upc="item.upc"
                  >
                    <template v-slot:btn v-if="!upcs.has(item.upc)">
                      <v-flex md1>
                        <v-btn fab dark color="blue" @click="createProductFromTransfer(item)" style="width: 25px; height: 25px; margin: 0px;">
                          <v-icon dark>add</v-icon>
                        </v-btn>
                      </v-flex>
                    </template>
                    <template v-slot:info>
                      <v-flex class="text-xs-right" style="white-space: nowrap">${{ (item.unitPrice || 0).toLocaleString() }} * {{ item.toShip }}</v-flex>
                    </template>
                  </ProductWidget>
                </v-flex> 
                <v-layout>
                  <v-flex :class="noteClass">{{props.item.note}}</v-flex>
                </v-layout>
              </td>
              <td class="text-xs-left">                    
                ${{ props.item.items.reduce((acc, item) => acc + (item.unitPrice || 0) * item.toShip, 0).toLocaleString() }}
              </td>
              <td class="text-xs-left">
                <v-layout>
                  {{ props.item.warehouseName }}
                </v-layout>
                <v-layout>
                  {{ props.item.location }}
                </v-layout>
              </td>
              <td class="text-xs-left">{{ props.item.userName }}</td>
              <td class="text-xs-left">{{ toTimestampString(props.item.createTime) }}</td>
              <td class="text-xs-right">
                <v-layout v-if="isOrganization">
                  <v-flex v-if="props.item.to === isOrganization">
                    <LoaderButton
                      v-if="!props.item.userKey"
                      buttonText="Add"
                      :promiseAwait="addTransferToInventory"
                      :promiseItem="props.item"
                      :flat="true"
                      :disabled="!isUpcFullfilled(props.item.items)"/>
                    <v-btn color="primary" v-else flat :disabled="!isUpcFullfilled(props.item.items)" @click.stop="showAddToInventoryDialog(props.item)">Add</v-btn>
                  </v-flex>
                  <v-flex v-if="isOrganization">
                    <LoaderButton
                      :buttonText="props.item.to === $store.getters.activeOrganization ? 'Reject' : 'Cancel'"
                      :promiseAwait="cancelTransfer"
                      :promiseItem="props.item"
                      :flat="true"/>
                  </v-flex>
                  <v-flex v-if="props.item.files"><v-btn color="primary" flat @click.stop="downloadFile(props.item.files)" :disabled="!props.item.files.length">Attachment</v-btn></v-flex>
                </v-layout>
              </td>
            </template>
          </v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <ProductTransferPopup
      title="New Transfer"
      v-model="addTransferDialog"
      v-if="addTransferDialog"
      :actionFunc="createTransfer"
      rightButtonText="Submit"
      large/>
    <ProductEdit
      title="Add product"
      v-model="addProductDialog"
      v-if="addProductDialog"
      actionText="Add"
      upcReadOnly
      :actionFunc="addProduct"
      :product="productInEdit"></ProductEdit>
    <FormSubmitPopup
      title="Pending Period"
      v-model="addToInventoryDialog"
      v-if="addToInventoryDialog"
      @popupClose="() => {addToInventoryDialog = false}"
      :rightMethod="() => addTransferToInventory({...transferInEdit, pendingPeriod})"
      rightButtonText="Submit"
      small>
      <template v-slot:input>
        <v-layout>
          <v-flex>
            <v-text-field
              label="Pending period"
              class="required_field"
              :rules="[fieldIsRequired('Pending period'), fieldIsInteger('Pending period'), fieldIsNoLessThanZero('Pending period')]"
              v-model.number="pendingPeriod"></v-text-field>
          </v-flex>
        </v-layout>
      </template>
    </FormSubmitPopup>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import ProductTransferPopup from './ProductTransferPopup'
import ProductWidget from './ProductWidget'
import ProductEdit from './ProductEdit'
import PaginationController from './PaginationController'
import { checkRules, timeTools } from '../utils/tools'
import LoaderButton from './LoaderButton'

export default {
  name: 'ProductTransferTenant',
  components: {
    PaginationController,
    FormSubmitPopup,
    ProductTransferPopup,
    ProductWidget,
    ProductEdit,
    LoaderButton
  },
  mixins: [checkRules, timeTools],
  data () {
    return {
      tab: null,
      addTransferDialog: false,
      tabs: ['Pending', 'History'],
      transferInEdit: {},
      headerHistory: [
        { text: 'Transaction ID', value: 'transactionId', align: 'left', sortable: false, width: '5%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Item <--> Unit price * Qty', value: 'item', align: 'left', sortable: false, width: '30%' },
        { text: 'Total', value: 'item', align: 'left', sortable: false },
        { text: 'Location', value: 'location', align: 'left', sortable: false },
        { text: 'Balance reciever', value: 'userName', align: 'left', sortable: false },
        { text: 'Status', value: 'userName', align: 'left', sortable: false },
        { text: 'Date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false, width: '10%' }
      ],
      headerPending: [
        { text: 'Transaction ID', value: 'transactionId', align: 'left', sortable: false, width: '5%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Item <--> Unit price * Qty', value: 'item', align: 'left', sortable: false, width: '30%' },
        { text: 'Total', value: 'item', align: 'left', sortable: false },
        { text: 'Location', value: 'location', align: 'left', sortable: false },
        { text: 'Balance reciever', value: 'userName', align: 'left', sortable: false },
        { text: 'Date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false, width: '10%' }
      ],
      historyLimit: 25,
      transferHistory: [],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      addInventoriesDialog: false,
      productInEdit: {},
      addProductDialog: false,
      refresh: false,
      types: [{name: '-- All --', type: 0}, {name: 'In', type: 1}, {name: 'Out', type: 2}, {name: 'Transaction ID', type: 3}],
      selectedType: 0,
      searchName: '',
      paymentOnly: false,
      addToInventoryDialog: false,
      pendingPeriod: -1,
      organizationKey: ''
    }
  },
  watch: {
    'selectedType': {
      handler: function (value) {
        this.searchName = ''
      },
      immediate: true
    },
    addToInventoryDialog (value) {
      if (value) {
        this.pendingPeriod = this.$store.getters.tenantLimitedInfo.pendingPeriod
      } else {
        this.pendingPeriod = -1
      }
    }
  },
  computed: {
    pendingTransfers () {
      return this.$store.getters.productTransfersPending.map(item => {
        if (item.to === this.$store.getters.activeOrganization) {
          item.items.map(ele => {
            if (this.upcs.has(ele.upc)) {
              let {condition, name} = this.products.find(prod => prod.upc === ele.upc)
              ele.condition = condition
              ele.name = name
            }
            return ele
          })
          return item
        }
        return item
      })
    },
    isOrganization () {
      return this.$store.getters.activeOrganization
    },
    upcs () {
      return new Set(this.$store.getters.products.map(item => item.upc).filter(item => item))
    },
    products () {
      return this.$store.getters.productsWithUpcChangeableFlag
    },
    historyPredicates () {
      if (this.selectedType === 0) {
        return [{
          field: `involvedKeys`,
          compare: 'array-contains',
          value: this.$store.getters.activeOrganization || this.$store.getters.activeWarehouse
        }]
      } else if (this.selectedType === 1) {
        let historyPredicates = [{
          field: `to`,
          compare: '==',
          value: this.$store.getters.activeOrganization
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
        }]
        if (this.searchName) {
          historyPredicates.push({
            field: `toName`,
            compare: '==',
            value: this.searchName.trim()
          })
        }
        return historyPredicates
      } else if (this.selectedType === 3) {
        let historyPredicates = [{
          field: `involvedKeys`,
          compare: 'array-contains',
          value: this.$store.getters.activeOrganization || this.$store.getters.activeWarehouse
        }]
        if (this.searchName) {
          historyPredicates.push({
            field: `transactionId`,
            compare: '==',
            value: this.searchName.trim()
          })
        }
        return historyPredicates
      } else if (this.selectedType === 4) {
        let historyPredicates = []
        if (this.organizationKey) {
          historyPredicates.push({
            field: `involvedKeys`,
            compare: 'array-contains',
            value: this.organizationKey
          })
        }
        return historyPredicates
      }
    },
    noteClass () {
      return this.$vuetify.breakpoint.smAndDown ? 'offerLink-small' : (this.$vuetify.breakpoint.mdOnly ? 'offerLink-medium' : (this.$vuetify.breakpoint.lgOnly ? 'offerLink-large' : 'offerLink-xlarge'))
    },
    organizations () {
      return this.$store.getters.sortedWarehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    organizationsForSelect () {
      return [{displayName: '-- All --', organizationId: '', key: ''}, ...this.organizations]
    }
  },
  methods: {
    showAddToInventoryDialog (item) {
      this.addToInventoryDialog = true
      this.transferInEdit = item
    },
    showAddInventoriesDialog () {
      this.addInventoriesDialog = true
    },
    showAddTransferDialog () {
      this.transferInEdit = {}
      this.addTransferDialog = true
    },
    showBadge (index) {
      switch (index) {
        case 0:
          return this.pendingTransfers.length > 0
        default:
          return false
      }
    },
    createTransfer (item) {
      return this.$store.dispatch('createProductTransfer', item)
        .then(() => {
          this.refresh = !this.refresh
        })
    },
    addTransferToInventory (item) {
      // if (!confirm('Are you sure to add this transfer to inventory?')) return Promise.resolve('')
      return this.$store.dispatch('addTransferToInventory', {...item, key: item._key})
    },
    createProductFromTransfer (item) {
      let {upc, name} = item
      this.productInEdit = {upc, name}
      this.addProductDialog = true
    },
    addProduct (product) {
      product.inbound = 0
      product.quantity = 0
      product.asin && (product.asin = product.asin.map(asin => {
        return asin.trim()
      }))
      let {_key, ...rest} = product

      return this.$store.dispatch('addProduct', rest)
    },
    downloadFile (files) {
      files && files[0] && this.$store.dispatch('downloadFile', files[0])
    },
    cancelTransfer (item) {
      if (!confirm(`Are you sure to ${item.to === this.$store.getters.activeOrganization ? 'reject' : 'cancel'} this transfer?`)) return Promise.resolve()
      return this.$store.dispatch('cancelTransfer', item)
    },
    isUpcFullfilled (items) {
      return items.every(item => this.upcs.has(item.upc))
    }
  }
}
</script>

<style>

.tabItem {
  font-size: 14px;
}

.notification .v-badge__badge{
  width: 5px;
  height: 5px;
  top: -3px;
  right: -5px;
}

.font-green {
    color: green;
    font-size: 15px;
}

.offerLink-xlarge, .offerLink-xlarge .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 30vw !important;
  white-space: pre-wrap;
}

.offerLink-large, .offerLink-large .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 20vw !important;
  white-space: pre-wrap;
}

.offerLink-medium, .offerLink-medium .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 15vw !important;
  white-space: pre-wrap;
}

.offerLink-small, .offerLink-small .offer-widget {
  overflow-wrap: break-word !important;
  max-width: 15vw;
  white-space: pre-wrap;
}

</style>
