<template>
  <v-container fluid>
    <v-layout v-if="skusForDisplay.length > 0">SKUs:&nbsp;
      <span
        v-for="item in skusForDisplay" 
        :key="item"
      >
        <span :class="isSkuFulfilled(item.split(' ')[0]) ? '' : 'fulfillment_list'">{{item}}</span>
        <span>&nbsp;</span>
      </span>
    </v-layout>
    <v-layout class="text-xs-center" justify-space-between align-center>
      <v-btn 
        flat 
        large 
        class="my-2 upload-file"
        color="primary" 
        @click.stop="showAddInventoriesDialog()" 
        :disabled="isBillingBalanceBelowCritical || isConfirmed"
      ><v-icon dark large class="mx-3">add</v-icon> Add product</v-btn>
      <v-alert
        v-model="showAlert"
        dismissible
        outline
        type="error">{{errorMessage}}</v-alert>
      <v-flex xs5 lg4>
        <v-icon color="primary">info</v-icon>
        Unit price is for book keeping purpose, and only visible to organization.
      </v-flex>
      <v-flex xs3 lg2>
        <v-text-field
          append-icon="filter_list"
          label="Search"
          single-line
          hide-details
          v-model.trim="filter"
          clearable
        ></v-text-field>
      </v-flex>
    </v-layout>
    <v-form ref="form" v-model="isValid" lazy-validation>
      <v-data-table
        :headers="headers"
        :items="Object.values(this.products)"
        :search="filter"
        ref="dataTable"
        class="elevation-2"
        item-key="shipmentProductKey"
        no-data-text="--- No product selected ---"
        hide-actions
      >
        <template v-slot:headerCell="props">
          <template v-if="props.header.value === 'toShip'">
            To-ship (Total: {{ filteredItems.reduce((acc, item) => (acc + (item.toShip || 0)), 0) }})
          </template>
          <template v-else-if="props.header.value === 'unitPrice'">
            Unit price(Total: ${{ filteredItems.reduce((acc, item) => (acc + (item.toShip || 0) * (item.unitPrice || 0)), 0).toLocaleString() }})
          </template>
          <template v-else-if="props.header.value === 'unitCost'">
            Unit cost(Total: ${{ filteredItems.reduce((acc, item) => (acc + (item.toShip || 0) * (item.unitCost || 0)), 0).toLocaleString() }})
          </template>
          <template v-else>
            {{ props.header.text }}
          </template>
        </template>
        <template v-slot:items="props">
          <td class="subheading">{{ props.index + 1 }}</td>
          <td>
            <ProductWidget
              :name="props.item.name"
              :condition="props.item.condition"
              :upc="props.item.upc"
              :sku="props.item.sku"></ProductWidget>
          </td>
          <td class="text-xs-left">{{ props.item.userName}}</td>
          <td class="text-xs-left">{{ props.item.siteName }}</td>
          <td class="text-xs-left">
            <v-flex md6>
              <v-text-field
                :class="selectedOrder && !isProductExhausted(props.item.fbmKey) ? 'fulfillment_warning_text' : ''"
                v-model.number="props.item.toShip"
                autofocus
                :rules="[fieldIsRequired('package quantity'), fieldIsOverZero('package quantity'), fieldIsInteger('package quantity')]"
                mask="#####"></v-text-field>   
            </v-flex>
          </td>
          <td class="text-xs-left">
            <v-flex md6>
              <v-text-field
                v-model.number="props.item.unitPrice"></v-text-field>   
            </v-flex>
          </td>
          <td class="text-xs-left">
            <v-flex md6>
              <v-text-field
                v-model.number="props.item.unitCost"></v-text-field>   
            </v-flex>
          </td>
          <td class="text-xs-left">{{ props.item.quantity }}</td>
          <td class="text-xs-center">
            <v-layout row justify-center>
              <v-flex><v-btn color="red" flat icon @click.stop="deleteProduct(props.item)" :disabled="isConfirmed"><v-icon>cancel</v-icon></v-btn></v-flex>
              <v-flex v-if="skus.size > 0">
                <v-menu offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn @click.stop="on.click" dark flat color="primary">
                      <v-icon>add</v-icon>Sku
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-tile v-for="item in skus.keys()" :key="item" @click="addSkuToProduct(props.item, item)">
                      <v-list-tile-title>{{item}}</v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                </v-menu>
              </v-flex>
            </v-layout>
          </td>
        </template>
      </v-data-table>
      <v-layout class="py-3 my-2 elevation-2">
        <v-flex xs4>
          <v-btn flat large color="primary" class="my-2 upload-file" title="upload labels" :disabled="isConfirmed">
            <v-icon dark large class="mx-3">cloud_upload</v-icon>
            Upload
            <input type="file" multiple v-on:click="clearSelectionCache" v-on:change="fileSelected" accept="*"/>
          </v-btn>
          <v-btn flat large color="primary" class="my-2 upload-file" :disabled="!$store.getters.betaFeatures.includes('labelAndOrder') || isConfirmed || (selectedOrder && labels.length >= 1)" @click="showCreateLabelDialog">
            <v-icon dark large class="mx-3">shopping_cart</v-icon>
            Buy label
          </v-btn>
        </v-flex>
        <v-flex xs8>
          <v-layout align-center justify-end v-for="(item, index) in files" :key="item.file.name + index">
            <v-flex xs12 sm8 md5 class="text-lg-right text-md-right">
              {{item.file.name}}
            </v-flex>
            <v-flex md1 class="text-lg-center text-md-center"><v-icon>cloud_upload</v-icon></v-flex>
            <v-flex xs12 sm3 md1>
              <v-progress-circular
                :size="20"
                :width="3"
                :rotate="360"
                :value="item.task.progress"
                color="teal"
                class="ml-3"
                v-if="item.task.progress !== 100"
              >
              </v-progress-circular>
            </v-flex>
            <v-flex xs1>
              <v-tooltip top v-if="item.metadata.type === 'application/pdf'">
                <template v-slot:activator="tooltip">
                  <div v-on="tooltip.on">
                    <v-checkbox v-model="item.isMerge"></v-checkbox>
                  </div>
                </template>
                {{ item.isMerge ? 'Shipping label' : 'Not shipping label' }}
              </v-tooltip>
            </v-flex>
            <v-flex xs12 sm3 md1 v-if="!isConfirmed">
              <v-btn dark small color="red" icon :disabled="isLoading" flat @click.stop="removeFileFromList(item, index)">
                <v-icon dark>cancel</v-icon>
              </v-btn>
            </v-flex>
          </v-layout>
          <v-layout v-if="labels.length" align-center justify-end v-for="item in labels" :key="item.labelKey">
            <v-flex xs12 sm8 md5 class="text-lg-right text-md-right">
              {{item.labelKey}}
            </v-flex>
            <v-flex md1 class="text-lg-center text-md-center"><v-icon>shopping_cart</v-icon></v-flex>
            <v-flex md1></v-flex>
            <v-flex xs1>
              <v-tooltip top>
                <template v-slot:activator="tooltip">
                  <div v-on="tooltip.on">
                    <v-checkbox v-model="item.isMerge"></v-checkbox>
                  </div>
                </template>
                {{ item.isMerge ? 'Shipping label' : 'Not shipping label' }}
              </v-tooltip>
            </v-flex>
            <v-flex xs12 sm3 md1 v-if="!isConfirmed">
              <v-btn dark small color="red" icon flat @click.stop="removeLabelFromShipment(item)">
                <v-icon dark>cancel</v-icon>
              </v-btn>
            </v-flex>
          </v-layout>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between row class="mt-3">
        <v-flex xs12 sm2>
          <v-text-field
            label="Shipment ID"
            v-model="shipmentId"
          ></v-text-field>
        </v-flex>
        <v-flex xs12 sm2>
          <v-text-field
            label="Tracking number"
            v-model="trackingNum"
          ></v-text-field>
        </v-flex>
        <v-flex xs12 sm2>
          <v-text-field
            label="Package quantity"
            v-model.number="packageQty"
            :rules="[fieldIsRequired('package quantity'), fieldIsOverZero('package quantity'), fieldIsInteger('package quantity')]"
            class="required_field"
          ></v-text-field>
        </v-flex>
        <v-flex xs12 sm2>
          <v-autocomplete
            label="Service type"
            v-model="isExpedited"
            item-text="label"
            item-value="value"
            :items="[{label: 'Normal', value: false}, {label: 'Expedite', value: true}]"></v-autocomplete>
        </v-flex>
        <v-flex xs12 sm2>
          <SelectWidget
            label="Other Services"
            :items="otherServices"
            v-model="selectedOtherServices"
            itemText='displayName'
            itemValue='value'
            chipText='displayName'
            :displayQty="3"
            />
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex xs12 sm2>
          <v-autocomplete
            label="Carrier"
            v-model="carrier"
            :items="carriers"
            clearable></v-autocomplete>
        </v-flex>
        <v-flex xs12 sm2 v-if="carrier === 'others'">                              
          <v-text-field
            label="Carrier"
            v-model="otherCarrier"
          ></v-text-field>
        </v-flex>
        <v-flex xs12 sm2 v-else></v-flex>
        <v-flex xs12 sm2>
          <v-autocomplete
            label="Destination"
            v-model="destination"
            :items="destinations"
            item-text="name"
            return-object
            clearable></v-autocomplete>
        </v-flex>
        <v-flex xs12 sm2  v-if="destination && destination.name === '-- Other --'">
          <v-text-field
            label="Destination content"
            v-model="destination.content"
          ></v-text-field>
        </v-flex>
        <v-flex sm2 v-else></v-flex>
        <v-flex sm2>
          <v-autocomplete
            style="margin-bottom: 0;"
            label="Template"
            v-model="instruction"
            :items="instructions"
            item-text="name"
            return-object
            clearable></v-autocomplete>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between align-end>
        <v-flex xs5>
          <v-layout>
            <v-textarea
              label="Note to yourself"
              v-model="note"
              outline
              rows="6"
              class="thinBox"
              persistent-hint
              hint="Only visible to organization"></v-textarea>
          </v-layout>
        </v-flex>
        <v-flex xs5>
          <v-layout>
            <v-textarea
              label="Instruction"
              outline
              v-model="instructionContent"
              rows="6"
              class="thinBox"></v-textarea>
          </v-layout>
        </v-flex>
      </v-layout>
      <v-layout justify-space-between>
        <v-flex>
          <slot name="leftBtn"/>
        </v-flex>
        <v-flex class="text-xs-right">
          <v-layout v-show="!isConfirmed" align-center>
            <v-flex>
              <p v-if="isBillingBalanceBelowCritical" class="warning_text">
                This feature is disabled because of very low balance
              </p>
            </v-flex>
            <v-flex xs4 v-if="selectedOrder">
              <v-text-field
                label="Add search keywords"
                v-model="keywords"></v-text-field>   
            </v-flex>
            <LoaderButton
              v-if="!initDraft"
              buttonText="Create draft"
              :promiseAwait="createDraft"
              :disabled="isLoading"
              @input="(e) => isLoading = e"
            ></LoaderButton>
            <LoaderButton
              v-else
              buttonText="Save draft"
              :promiseAwait="saveDraft"
              :disabled="isLoading"
              @input="(e) => isLoading = e"
            ></LoaderButton>
            <LoaderButton
              :buttonText="initDraft ? 'Publish' : 'Create Shipment'"
              :disabled="isBillingBalanceBelowCritical || !isFileReady || Object.values(this.products).length === 0 || isConfirmed || !isValid || isProductMixed || hasError || isLoading"
              :promiseAwait="submitShipment"
              @input="(e) => isLoading = e"
            ></LoaderButton>
            <v-btn
              color="primary"
              @click="$router.push('/outBoundHistory')"
              :disabled="isLoading">Status</v-btn>
          </v-layout>
          <v-layout align-baseline  v-show="isConfirmed">
            <v-flex>Success !</v-flex>
            <v-btn
              color="primary"
              @click="reset">Create another</v-btn>
            <v-btn
              color="primary"
              @click="$router.push('/outBoundHistory')"
              :disabled="isLoading">Status</v-btn>
          </v-layout>
        </v-flex>
      </v-layout>
    </v-form>
    <AddInventories
      title="Select Product"
      v-model="addInventoriesDialog"
      v-if="addInventoriesDialog"
      @deleteDistribution="(item) => deleteProduct(item)"
      @addDistribution="(item) => addProduct(item)"
      :addedDistributionSet="addedDistributionSet"
      :editMode="true"
      :skus="skus"
      :allDistribution="allDistribution"></AddInventories>
    <LabelCreatePopup
      v-model="createLabelDialog" 
      v-if="createLabelDialog"
      :froms="addresses"
      executeOutside
      :idGenerator="labelIdGenerator"
      @submitted="addToLabels"
      :initFrom="shipFrom"
      :initTo="shipTo"
      :onlyOneLabel="onlyOneLabel"
      :labelNote="labelNote"
      :order="order"
      :initTemplate="template"/>
  </v-container>
</template>

<script>
import ProductWidget from './ProductWidget'
import AddInventories from './AddInventories'
import LoaderButton from './LoaderButton'
import SelectWidget from './SelectWidget'
import { sortNoCase, checkRules, getRandomIdByTime } from '../utils/tools'
import * as rules from '../utils/rules'
import * as firebase from 'firebase/app'
import LabelCreatePopup from './LabelCreatePopup'

export default {
  name: 'toEveryone',
  components: {
    ProductWidget,
    AddInventories,
    LoaderButton,
    SelectWidget,
    LabelCreatePopup
  },
  mixins: [checkRules],
  data () {
    const {
      recipientName,
      shipAddress1,
      shipAddress2,
      shipCity,
      shipPostalCode,
      shipState,
      buyerPhoneNumber
    } = this.selectedOrder || {}
    return {
      products: {},
      files: [],
      addInventoriesDialog: false,
      productInEdit: {},
      user: {},
      carrier: '',
      otherCarrier: '',
      selectedOtherServices: [],
      otherServices: [
        {value: 'label', displayName: 'Label'}, 
        {value: 'photo', displayName: 'Photo'}, 
        {value: 'SN', displayName: 'SN'}
      ],
      carriers: ['USPS', 'FedEx', 'UPS', 'DHL', 'others'],
      instruction: {},
      instructionContent: '',
      note: '',
      shipmentId: '',
      trackingNum: '',
      destination: {},
      isConfirmed: false,
      packageQty: 0,
      isValid: true,
      isExpedited: false,
      createLabelDialog: false,
      labels: [],
      requestId: getRandomIdByTime(3),
      shipFrom: {},
      shipTo: this.selectedOrder ? {
        fullName: recipientName,
        address1: shipAddress1,
        address2: shipAddress2,
        city: shipCity,
        zipCode: shipPostalCode.slice(0, 5),
        state: shipState,
        phone: buyerPhoneNumber
      } : {},
      labelIndex: 0,
      keywords: '',
      isLoading: false,
      filter: '',
      filteredItems: []
    }
  },
  beforeRouteEnter (to, from, next) {
    if (to.path === '/toEveryone/initDraft' && from.path === '/signin') {
      next('/toEveryone')
    } else {
      next()
    }
  },
  beforeRouteLeave (to, from, next) {
    // todo: add data diff check
    if (!this.isConfirmed) {
      const answer = window.confirm('Do you really want to leave? Unsaved changes will be missing.')
      if (answer) {
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  },
  mounted () {
    this.$watch(() => this.$refs.dataTable.filteredItems, (newValue, oldValue) => { this.filteredItems = newValue })
    if (this.initDraft) {
      this.initThisFromDraft()
    }

    // auto add distribution
    if (this.distribution && this.selectedOrder && this.selectedOrder.items.length === 1) {
      let fitDistributions = this.distribution
        .filter(item => item.sku && item.sku
          .some(sku => sku === this.selectedOrder.items[0].sku))
          
      if (fitDistributions.length === 1) {
        let {warehouseSite, id} = fitDistributions[0]
        const {quantityPurchased, quantityShipped} = this.selectedOrder.items[0]
        this.$set(this.products, id, {
          ...fitDistributions[0], 
          toShip: quantityPurchased - quantityShipped,
          shipmentProductKey: `${warehouseSite}${id}`,
          fbmKey: id
        })
      }
    }

    if (this.template) {
      const {selectedOtherServices, isExpedited, instruction} = this.template
      Object.assign(this, {selectedOtherServices, isExpedited, instructionContent: instruction})
    }
  },
  computed: {
    skus () {
      let map = new Map()
      if (!this.selectedOrder) return map
      let {items} = this.selectedOrder
      items.forEach(item => {
        let {sku, quantityPurchased, quantityShipped} = item
        if (!map.has(sku)) {
          map.set(sku, 0)
        }
        map.set(sku, map.get(sku) + quantityPurchased - quantityShipped)
      })
      return map
    },
    isProductsOutOfSkus () {
      if (!this.skus.size) return false
      return Object.values(this.products).some(product => {
        return !product.sku ||
          product.sku.every(sku => {
            return !this.skus.has(sku)
          })
      })
    },
    fulfillment () { 
      let fulfillment = new Map()
      let surplusProducts = new Map()
      
      Object.keys(this.products).forEach(fbmKey => {
        let {toShip, sku} = this.products[fbmKey]
        surplusProducts.set(fbmKey, {toShip, sku})
      })

      this.skus.forEach((value, key) => {
        fulfillment.set(key, 0)
      })

      surplusProducts.forEach((product, fbmKey) => {
        let {sku = []} = product
        sku.forEach(matchingSku => {
          if (fulfillment.has(matchingSku) && product.toShip > 0) {
            let matchingQty = Math.min(product.toShip, this.skus.get(matchingSku) - fulfillment.get(matchingSku))
            product.toShip -= matchingQty
            fulfillment.set(matchingSku, fulfillment.get(matchingSku) + matchingQty)
          }
        })
      })
      return {fulfillment, surplusProducts}
    },
    // with the assumption that there would not be an sku assigned to more than one upcs
    skusForDisplay () {
      return [...this.skus.entries()]
        .map(entry => `${entry[0]} (${entry[1]})`)
    },
    members () {
      let members = Object.values(this.products).map(product => { 
        return {
          userName: product.userName, 
          userKey: product.uid, 
          warehouseKey: product.warehouseKey || ''
        } 
      })
      return members
    },
    isFileReady () {
      return this.files.length + this.labels.length > 0 && this.files.every(item => { return item.task.progress === 100 })
    },
    isAnyToshipZero () {
      return Object.values(this.products).length === 0 || Object.values(this.products).some(item => {
        return !item.toShip || item.toShip === 0
      })
    },
    isProductMixed () {
      return (new Set(Object.values(this.products).map(item => !!item.isCustom))).size > 1
    },
    hasProductEmptyUpc () {
      return Object.values(this.products).some(product => !product.upc)
    },
    destinations () {
      return [...[...this.$store.getters.tenant.destinations].sort(sortNoCase('name')), {name: '-- Other --', content: ''}] || [{name: '-- Other --', content: ''}]
    },
    instructions () {
      return this.$store.getters.tenant.instructions || []
    },
    isBillingBalanceBelowCritical () {
      let selectedWarehouseKeys = new Set(Object.values(this.products)
        .filter(item => item.warehouseKey)
        .map(item => item.warehouseKey))
      let warehouses = this.$store.getters.warehousesWithBalanceAndThreshold
        .filter(warehouse => warehouse.warehouseName !== 'Others' && selectedWarehouseKeys.has(warehouse.warehouseKey))
      return warehouses.some(warehouse => warehouse.balance && parseFloat(warehouse.balance) <= (warehouse.criticalLowBalanceThreshold || 0))
    },
    isAllProductsOneSite () {
      let productsSet = new Set(Object.values(this.products).map(product => product.siteName))
      return productsSet.size < 2
    },
    allDistribution () {
      return this.$store.getters.allDistribution
    },
    addedDistributionSet () {
      return new Set(Object.keys(this.products || {}))
    },
    addresses () {
      return this.$store.getters.tenantAddresses
    },
    hasError () {
      return this.isBillingBalanceBelowCritical || 
        this.isProductMixed || 
        this.hasProductEmptyUpc || 
        !this.isAllProductsOneSite || 
        this.isProductsOutOfSku
    },
    showAlert: {
      get: function () {
        return this.hasError
      },
      set: function (val) {
        
      }
    },
    errorMessage () {
      if (this.isBillingBalanceBelowCritical) return 'This feature is disabled because of very low balance.'
      if (this.isProductMixed) return 'Cannot outbound custom size product with other size type product.'
      if (this.hasProductEmptyUpc) return 'All shipping products must have upc.'
      if (!this.isAllProductsOneSite) return 'Cannot outbound shipment from multiple sites.'
      if (this.isProductsOutOfSkus) return 'Select other sku product will not change shipped qty.'
    },
    headers () {
      return [
        { text: 'ID#', value: 'onlyForSearch', align: 'left', sortable: false, width: '5%' },
        { text: 'Product', value: 'name', align: 'left', sortable: false },
        { text: 'User', value: 'userName', align: 'left', sortable: false },
        { text: 'Site', value: 'siteName', align: 'left', sortable: false },
        { 
          text: `To-ship`, 
          value: 'toShip', 
          align: 'left', 
          sortable: false 
        },
        { text: 'Unit price', value: 'unitPrice', align: 'left', sortable: false },
        { text: 'Unit cost', value: 'unitCost', align: 'left', sortable: false },
        { text: 'Available', value: 'quantity', align: 'left', sortable: false },
        { text: 'Action', value: 'upc', align: 'center', sortable: false, width: '8%' }
      ]
    }
  },
  watch: {
    members (value) {
      this.user = this.members[0] || {}
    },
    instruction (value) {
      if (value) {
        this.instructionContent = this.instruction.content || ''
      } else {
        this.instructionContent = ''
      }
    },
    destination (value) {
      if (!value) {
        this.destination = {}
      }
    }
  },
  methods: {
    initThisFromDraft () {
      Object.entries(this.initDraft).forEach(([key, val]) => {
        if (this[key] !== undefined) {
          this[key] = val
        }
      })

      Object.entries(this.products).forEach(([key, val]) => {
        let target = this.allDistribution.find(item => item.fbmKey === key) || {}
        this.products[key].quantity = target.quantity || 0
      })
    },
    reset () {
      if (this.initDraft) {
        this.$router.push('/toEveryone')
        return
      }
      this.products = {}
      this.files = []
      this.labels = []
      this.addInventoriesDialog = false
      this.productInEdit = {}
      this.user = {}
      this.carrier = ''
      this.otherCarrier = ''
      this.instruction = {}
      this.instructionContent = ''
      this.note = ''
      this.trackingNum = ''
      this.isConfirmed = false
      this.destination = {}
      this.isExpedited = false
      this.packageQty = 0
      this.shipmentId = ''
      this.selectedOtherServices = []
      this.requestId = getRandomIdByTime(3)
      this.isLoading = false
    },
    quantityChanged (event, item) {
      if (rules.isNumber(event) === true) {
        if (event > item.quantity) {
          alert(`input exceed available quantity of ${item.quantity}`)
          item.toShip = item.quantity
        }
      } else {
        alert('quantity format invalid')
      }
    },
    clearSelectionCache (e) {
      e.target.value = null
    },
    fileSelected (e) {
      Object.values(e.target.files).forEach(newFile => {
        if (this.checkFilenameExists(newFile.name)) {
          this.$store.dispatch('showToast', {info: `file exists: newFile.name`})
          console.log('file already selected: ', newFile.name)
          return
        }
        newFile.prettySize = newFile.size > 1048576 ?
          (Math.round(newFile.size / 1048576) + ' ' + 'MB') 
          :
          newFile.size > 1024 ? 
            (Math.round(newFile.size / 1024) + ' ' + 'KB')
            :
            newFile.size + ' ' + 'B'
        if (newFile.size > 5242880) {
          this.$store.dispatch('showToast', {info: `${newFile.name} is too big, can't upload a file bigger than 5MB`, level: 'error'})
          return 
        }
        this.$store.dispatch('uploadLabels', newFile)
          .then(rtn => {
            console.log('uploaded File: ', rtn.metadata.name)
            this.listenToFileUpload(rtn)
            this.files.push({...rtn, isMerge: true})
          })
      })      
    },
    checkFilenameExists (filename) {
      return this.files.findIndex(item => item.metadata.name === filename) !== -1
    },
    listenToFileUpload (file) {
      // Listen for state changes, errors, and completion of the upload.
      file.task.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          this.$set(file.task, 'progress', progress)
        }, (error) => {
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          switch (error.code) {
            case 'storage/unauthorized':
              // User doesn't have permission to access the object
              break

            case 'storage/canceled':
              // User canceled the upload
              break

            case 'storage/unknown':
              // Unknown error occurred, inspect error.serverResponse
              break
          }
        }, () => {
          // Upload completed successfully, now we can get the download URL
          file.task.snapshot.ref.getDownloadURL().then(downloadURL => {
            file.metadata.downloadURL = downloadURL
            console.log('File available at', downloadURL)
          })
        })
    },
    deleteFileFromStorage (file) {
      return this.$store.dispatch('removeFile', file.metadata.fullPath)
        .catch(error => {
          console.error('error removing file: ', error)
        })
    },
    removeFileFromList (file, index, noPrompt) {
      if (noPrompt || confirm('Are you sure to remove this file?')) {
        file.task && file.task.cancel && file.task.cancel()
        if (file.task.snapshot.state === 'success') {
          this.deleteFileFromStorage(file)
            .catch(error => {
              if (error.code === 'storage/object-not-found') {
                this.files.splice(index, 1)
              } else {
                this.$store.dispatch('showToast', {info: `delete file failed`})
              }
            })
            .then(rtn => {
              this.files.splice(index, 1)
            })
        } else {
          this.files.splice(index, 1)
        }
      }
    },
    showAddInventoriesDialog () {
      this.addInventoriesDialog = true
    },
    showAddProductDialog (product) {
      this.productInEdit = product
      this.addProductDialog = true
    },
    addProduct (distribution) {
      this.$set(this.products, distribution.fbmKey, {
        ...distribution, 
        toShip: 0, 
        unitPrice: 0,
        unitCost: 0,
        shipmentProductKey: `${distribution.warehouseSite}${distribution.id}`
      })
    },
    deleteProduct (distribution) {
      this.$delete(this.products, distribution.fbmKey)
    },
    submitShipment () {
      if (this.isBillingBalanceBelowCritical) return Promise.reject(Error('very low balance'))
      if (this.isProductMixed) return Promise.reject(Error('Product mixed'))
      if (!this.$refs.form.validate()) return Promise.reject(Error('Form validate failed.'))
      const files = this.files.map((file) => {
        return {...file.metadata, isMerge: !!file.isMerge}
      })
      let products = Object.values(this.products).map(product => {
        let {
          id, 
          name, 
          condition, 
          siteName, 
          toShip, 
          uid, 
          upc, 
          userName, 
          warehouseSite, 
          fbmKey, 
          asin = [], 
          isCustom = false, 
          unitPrice = 0,
          unitCost = 0
        } = product
        return {id, name, condition, siteName, toShip, uid, upc, userName, warehouseSite, fbmKey, asin, isCustom, unitPrice, unitCost}
      })
      let payload = {
        _key: this.requestId,
        products,
        files,
        ...this.user,
        status: 'created',
        packageQty: this.packageQty,
        shipmentId: this.shipmentId,
        trackingNum: this.trackingNum,
        note: this.note,
        instruction: this.instructionContent,
        destination: this.destination || {},
        carrier: this.carrier === 'others' ? this.otherCarrier : (this.carrier || ''),
        isExpedited: this.isExpedited,
        isCustom: products[0].isCustom,
        otherServices: this.selectedOtherServices,
        labels: this.labels.map(item => {
          let {
            orderId,
            serviceType,
            shippingService: carrier,
            packaging,
            isMerge
          } = item
          return {            
            orderId,
            serviceType,
            carrier,
            packaging,
            isMerge
          }
        })
      }

      if (this.selectedOrder) {
        payload.selectedOrder = this.selectedOrder
        payload.selectedProducts = Object.values(this.products)
        payload.keywords = this.keywords + ' shipping'
      }
      if (this.initDraft) {
        payload.draftKey = this.initDraft._key
      }
      return this.$store.dispatch('addShipment', payload)
        .then(() => {
          if (this.initDraft) {
            return this.$store.dispatch('cancelShipmentDraft', this.initDraft)
          }
        })
        .then(() => {
          console.log('create shipment successful')
          this.isConfirmed = true
          this.$emit('submitted', true)
        })
        .catch(error => {
          console.error(error)
          this.isConfirmed = false
          this.$store.dispatch('showToast', {info: 'create shipment failed, try again or contact support'})
        })
    },
    getBillingBalance () {
      let warehouses = this.$store.getters.warehousesWithBalanceAndThreshold
      let criticalLowBalanceThreshold = warehouses
        .reduce(
          (maxLowBalanceThreshold, curWarehouse) => 
            maxLowBalanceThreshold >= (curWarehouse.criticalLowBalanceThreshold || 0) 
              ? maxLowBalanceThreshold : curWarehouse.criticalLowBalanceThreshold, 
          (warehouses[0].criticalLowBalanceThreshold || 0)
        )
      this.isBillingBalanceNegative = warehouses.some(warehouse => warehouse.balance && parseFloat(warehouse.balance) <= criticalLowBalanceThreshold)
    },
    isSkuFulfilled (sku) {
      let {fulfillment} = this.fulfillment
      return fulfillment.get(sku) === this.skus.get(sku)
    },
    isProductExhausted (fbmKey) {
      let {surplusProducts} = this.fulfillment
      return surplusProducts.get(fbmKey).toShip === 0
    },
    async showCreateLabelDialog (item) {
      if (Object.values(this.products)[0]) {
        await this.getShipFrom(Object.values(this.products)[0])
      }
      this.createLabelDialog = true
    },
    addToLabels (labels) {
      this.labels = [...this.labels, ...labels.map(item => {
        return {...item, isMerge: true}
      })]
    },
    labelIdGenerator (qty) {
      let rtn = []
      for (let i = 0; i < qty; i++) {
        if (this.labelIndex > 99) throw Error('Exceeded label limit(100) from this shipment.')
        if (this.labelIndex < 10) {
          rtn.push(`${this.requestId}A0${this.labelIndex}`)
        } else {
          rtn.push(`${this.requestId}A${this.labelIndex}`)
        }
        this.labelIndex++
      }
      return rtn
    },
    removeLabelFromShipment (label) {
      if (!confirm('Are you sure to remove this label? Note: This label can still be downloaded in Label page.')) return 
      this.labels = this.labels.filter(item => item.orderId !== label.orderId)
    },
    addSkuToProduct (product, sku) {
      let {sku: originSku} = product
      let set = new Set(originSku)
      set.add(sku)
      const newSku = [...set]
      /* eslint-disable no-unused-vars */
      let newProduct = {...product, sku: newSku}
      delete newProduct.onlyForSearch
      return this.$store.dispatch('editProduct', {newProduct})   
        .then(() => {
          this.$set(this.products[product.fbmKey], 'sku', newSku)
        })    
        .catch(error => {
          this.showToast('failed to update product', error.message)
        })
    },
    async getShipFrom (distribution) {
      this.shipFrom = await this.$store.dispatch('getShipFrom', distribution)
    },
    extractDraftData () {
      const {
        addInventoriesDialog, 
        otherServices, 
        carriers,       
        isConfirmed,
        isValid, 
        createLabelDialog, 
        isLoading,
        headers,
        ...rest
      } = this.$data
      return rest
    },
    createDraft () {
      return this.$store.dispatch('createShipmentDraft', this.extractDraftData())
        .finally(() => {
          this.isConfirmed = true
        })
    },
    async saveDraft () {
      return this.$store.dispatch('updateShipmentDraft', {data: this.extractDraftData(), key: this.initDraft._key})
        .finally(() => {
          this.isConfirmed = true
        })
    }
  },
  props: {
    initDraft: Object,
    selectedOrder: Object,
    template: Object,
    onlyOneLabel: Boolean,
    labelNote: String,
    order: Object
  }
}
</script>

<style scoped>
.upload-file input[type=file] {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 100%;
  min-height: 100%;
  text-align: right;
  filter: alpha(opacity=0);
  opacity: 0;
  outline: none;
  cursor: inherit;
  display: block;
}
</style>

<style>
.edit_text {
  border: 1px solid rgba(0,0,0,.54);
}

.warning_text {
  color:  red;
}

.fulfillment_warning_text input[type="text"] {
  background-color : yellow
}

.fulfillment_list {
  background-color : yellow
}
</style>
