<template>
  <v-container fluid>
    <FormSubmitPopup
      ref="form"
      title="Buy label(s)"
      v-model="value"
      :rightMethod="onSubmitted"
      @popupClose="$emit('input', false)"
      rightButtonText="Buy label(s)"
      hasAlert
      large>
      <template v-slot:input>
        <v-layout class="subheading" justify-space-between>
          <v-flex md8>
            Purchase {{Object.keys(orders).length}} label(s).
            <b>Note: </b> USPS label cannot be canceled
          </v-flex>
          <v-flex md2>
            <v-text-field
              label="Add search keywords"
              hint="Add space delimited keywords"
              v-model.trim="keywords"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="headers"
          :items="Object.values(orders)"
          :pagination.sync="pagination"
          item-key="orderId"
          class="elevation-2 myDense"
          hide-actions
        >
          <template v-slot:items="props">  
            <td class="text-xs-left">
              <v-layout>
                ID: {{ props.item.orderId }}
              </v-layout>
              <v-layout v-for="item in props.item.items" :key="item.orderItemId">
                <v-flex>
                  <ProductWidget
                    :name="item.productName"
                    :sku="[item.sku]"/>
                  <v-layout wrap>
                    <v-flex md6 class="text-sm-left">Purchased: {{ item.quantityPurchased }}</v-flex>
                    <v-flex md6 class="text-sm-left">Shipped: {{ item.quantityShipped }}</v-flex>
                  </v-layout> 
                  <v-layout align-baseline>
                    <v-flex md5>
                      <v-form :ref="`form-${props.item.orderId}-0-${item.orderItemId}`" lazy-validation>
                        <v-text-field
                          label="To ship"
                          v-model.number="props.item.toShip[item.orderItemId]"
                          :rules="[
                            fieldIsRequired('to-ship'), 
                            fieldIsOverZero('to-ship'), 
                            fieldIsInteger('to-ship'), 
                            (v) => item.quantityShipped + v <= item.quantityPurchased || 'To-ship + shipped exceeds purchased qty.'
                          ]"
                        ></v-text-field>
                      </v-form>
                    </v-flex>
                  </v-layout>
                </v-flex>
              </v-layout>
              <v-layout align-baseline>
                <v-flex md5>
                  <vite-autocomplete
                    hide-details
                    :items="addresses"
                    name="address-template-name"
                    return-object
                    label="Address name"
                    v-model="props.item.addressTemplate"
                    @change="(e) => onSelectAddress(e, props.item.orderId)"
                    item-text="siteName"
                    item-value="siteName"></vite-autocomplete>
                </v-flex>
              </v-layout>

              <v-layout>
                <v-flex v-if="JSON.stringify(props.item.shipFrom) !== '{}'" align-center>
                  Ship from: {{
                    `${props.item.shipFrom.address1} ${props.item.shipFrom.address2}, ${props.item.shipFrom.city}, ${props.item.shipFrom.state} ${props.item.shipFrom.zipCode}`
                  }}
                </v-flex>
                <v-tooltip top>
                  <template v-slot:activator="tooltip">
                    <div v-on="tooltip.on">
                      <v-btn
                        style="margin: 0px;"
                        color="primary"
                        icon
                        small
                        flat
                        @click="(e) => showEditAddressFrom(e, props.item)"
                      >
                      <v-icon>edit</v-icon>
                      </v-btn>
                    </div>
                  </template>
                  Change address
                </v-tooltip>
                <v-btn
                  color="primary"
                  small
                  dark
                  flat
                  @click="
                    applyShipFromToAll(
                      props.item.shipFrom, 
                      props.item.addressTemplate,
                      props.item.senderName,
                      props.item.fromCompanyName,
                    )"
                >
                  Apply to all
                </v-btn>
              </v-layout>
              <v-layout v-if="errorMessages[props.item.orderId]">
                <v-flex class="red--text font-weight-bold text-xs-left">
                  {{errorMessages[props.item.orderId]}}
                </v-flex>
              </v-layout>
              <div v-if="warningMessages[props.item.orderId]">
                <span class="font-weight-bold text-xs-left" style="background-color: yellow;">
                  {{warningMessages[props.item.orderId]}}
                </span>
              </div>
            </td>
            <td class="text-xs-left">
              <v-form :ref="`form-${props.item.orderId}-1`" lazy-validation>
                <v-layout>
                  <strong>{{ props.item.shipServiceLevel }}</strong>
                </v-layout>
                <v-layout>
                  Delivery by {{ toDateString(props.item.promiseDate) }} 
                </v-layout>
                <v-layout>
                  <strong>Recipient:</strong>
                </v-layout>
                <v-layout>
                  {{ props.item.recipientName }}
                </v-layout>
                <v-layout>
                  {{ props.item.shipAddress1 }} {{ props.item.shipAddress2 }}
                </v-layout>
                <v-layout>
                  {{ props.item.shipCity }} - {{ props.item.shipState }} {{ props.item.shipPostalCode }}
                  <v-tooltip top>
                    <template v-slot:activator="tooltip">
                      <div v-on="tooltip.on">
                        <v-btn
                          style="margin: 0px;"
                          color="primary"
                          icon
                          small
                          flat
                          @click="(e) => showEditAddressTo(e, props.item)"
                        >
                          <v-icon>edit</v-icon>
                        </v-btn>
                      </div>
                    </template>
                    Change address
                  </v-tooltip>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-autocomplete
                      :items="templates"
                      return-object
                      label="Template"
                      v-model="props.item.template"
                      persistent-hint
                      @change="(event) => onSelectTemplate(props.item.orderId, event)"
                      item-text="name"
                      item-value="name"
                    >
                      <template v-slot:append-outer>
                        <v-btn flat icon @click="showTemplateDialog(props.item)">                            
                          <v-icon
                            color="primary"
                          >add</v-icon>
                        </v-btn>
                      </template>
                      <template v-slot:item="props">
                        <template>
                          <v-list-tile-content>
                            {{ props.item.name }}
                          </v-list-tile-content>
                        </template>
                      </template>
                    </v-autocomplete>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-tooltip top>
                    <template v-slot:activator="tooltip">
                      <div v-on="tooltip.on">
                        <v-btn 
                          color="primary"
                          @click="(e) => showInstruction(e, props.item)"
                        >Instruction</v-btn>
                      </div>
                    </template>
                    <div style="white-space: pre-wrap; word-break: break-word; max-width: 300px">{{ props.item.instruction || '-no instruction-' }}</div>
                  </v-tooltip>
                </v-layout>
              </v-form>
            </td>
            <td class="text-xs-left">
              <v-form :ref="`form-${props.item.orderId}-2`" lazy-validation>
                <v-layout>
                  <v-flex>
                    <v-text-field
                      hide-details
                      v-model.number="props.item['weightLb']"
                      :rules="[
                        fieldIsRequired('weight'), 
                        fieldIsOverZero('weight'), 
                        isMeasurementMetric ? (() => true) : fieldIsPkgWeight(props.item['isOz'])
                      ]"
                      :label="isMeasurementMetric ? 
                        'Weight(kg)' :
                        `Weight(${props.item['isOz'] ? 'Click Oz switch to Lbs' : 'Click Lbs switch to Oz'})`"
                    >
                      <template v-slot:append>
                        <span v-if="!isMeasurementMetric" @click="props.item['isOz'] = !props.item['isOz']" style="cursor: pointer">{{ props.item['isOz'] ? 'Oz' : 'Lbs' }}</span>
                      </template>
                    </v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout align-center>
                  <v-flex xs4 class="mr-3">
                    <v-text-field
                      class="table-item"
                      hide-details
                      label="L"
                      v-model.number="props.item.packaging.length"
                      :suffix='sizeSuffix'
                      :rules="[
                        fieldIsRequired('length'), 
                        fieldIsOverZero('length')
                      ]"></v-text-field>
                  </v-flex>
                  <v-flex xs4 class="mr-3">
                    <v-text-field
                      class="table-item"
                      hide-details
                      label="W"
                      v-model.number="props.item.packaging.width"
                      :suffix='sizeSuffix'
                      :rules="[
                        fieldIsRequired('width'), 
                        fieldIsOverZero('width')
                      ]"></v-text-field>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      class="table-item"
                      hide-details
                      label="H"
                      v-model.number="props.item.packaging.height"
                      :suffix='sizeSuffix'
                      :rules="[
                        fieldIsRequired('height'), 
                        fieldIsOverZero('height')
                      ]"></v-text-field>
                  </v-flex>
                  <v-flex xs1>
                    <v-menu 
                      offset-y 
                      close-on-content-click
                      v-model="menu[props.index]"
                    >
                      <template v-slot:activator="{ on }">
                        <v-btn small icon @click.stop="on.click" dark flat color="primary">
                          <v-icon>expand_more</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-tile v-for="(item, index) in packagings" :key="index" @click.stop="(e) => onSelectPackaging(item, props.item)">
                          <v-list-tile-title>{{ item.name }}</v-list-tile-title>
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-select
                      hide-details
                      :items="shippingServices"
                      item-text="text"
                      :menu-props="{returnValue:'value'}"
                      v-model="props.item.shippingService"
                      :rules="[fieldIsRequired('service')]"
                      label="Shipping service"
                      @change="shippingServiceOnChange(props.item)"
                    >
                      <template v-slot:item="data">
                        <template v-if="isObject(data.item)">
                          <v-list-tile-content v-text="data.item"></v-list-tile-content>
                        </template>
                        <template v-else>
                          <v-list-tile-content>
                            <v-list-tile-title>
                              {{data.item.text}}
                            </v-list-tile-title>
                          </v-list-tile-content>
                        </template>
                      </template>
                    </v-select>
                  </v-flex>
                </v-layout>
              </v-form>
            </td>
            <td class="text-xs-left">
              <v-form :ref="`form-${props.item.orderId}-3`" lazy-validation>
                <v-layout>
                  <v-flex>
                    <v-text-field
                      label="Sender name"
                      v-model="props.item.senderName"
                      :rules="[fieldIsRequired('sender name'), fieldCharLimit('Sender name', 35)]"
                      prepend-icon="person"
                      hide-details
                    ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-text-field
                      label="Company name"
                      v-model="props.item.fromCompanyName"
                      prepend-icon="business"
                      hide-details
                    ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-menu
                      :close-on-content-click="false"
                      v-model="props.item.shipDateMenu"
                      :nudge-right="40"
                      lazy
                      transition="scale-transition"
                      offset-y
                      full-width
                      min-width="290px"
                    >
                      <template v-slot:activator="data">
                        <v-text-field
                          :value="props.item.shipDate"
                          label="Ship date"
                          prepend-icon="event"
                          readonly
                          v-on="data.on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-date-picker v-model="props.item.shipDate" @input="props.item.shipDateMenu = false"></v-date-picker>
                    </v-menu>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-text-field
                      hide-details
                      prepend-icon="business_center"
                      label="Declared value"
                      :disabled="!props.item.enableInsured"
                      v-model.number="props.item.insuredValue"
                      :rules="[fieldIsRequired('value'), fieldIsNoLessThanZero('value')]">
                    </v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-select
                      prepend-icon="bookmarks"
                      label="Signature service"
                      :items="signatureOptionsMap[props.item.carrier]"
                      item-text="text"
                      :menu-props="{returnValue:'value'}"
                      hide-details
                      v-model="props.item.signature"
                    />
                  </v-flex>
                </v-layout>
                <v-layout>
                  <v-flex>
                    <v-text-field
                      label="Memo"
                      v-model="props.item.memo"
                      :rules="[fieldCharLimit('Memo', 40)]"
                      prepend-icon="note"
                    ></v-text-field>
                  </v-flex>
                </v-layout>
              </v-form>
            </td>
            <td class="text-xs-left">
              <v-layout justify-center v-if="isLoadingRates[props.item.orderId]">
                <v-progress-circular
                  indeterminate
                  color="primary"></v-progress-circular>
              </v-layout>
              <v-layout justify-center v-else-if="!rates[props.item.orderId] || !Object.keys(rates[props.item.orderId]).length">
                $ ----
              </v-layout>
              <v-layout justify-center v-else>
                <v-tooltip top>
                  <template v-slot:activator="tooltip">
                    <div v-on="tooltip.on">
                      ${{rates[props.item.orderId].total}}
                    </div>
                  </template>
                  <b>Discount charge:</b> ${{rates[props.item.orderId].rate}} <b>Surcharge:</b> ${{rates[props.item.orderId].surcharge}} <b v-if="rates[props.item.orderId].isResidential">Residential</b>
                </v-tooltip>
              </v-layout>
              <v-layout justify-center>
                <v-btn color="primary" flat @click.stop="getRate(props.item.orderId)">Get rate</v-btn>
              </v-layout>
              <v-layout justify-center>
                <v-btn icon flat dark color="primary" @click.stop="removeOrder(props.item)" :disabled="isLoading">
                  <v-icon>delete</v-icon>
                </v-btn>
              </v-layout>
            </td>
          </template>
        </v-data-table>
        <v-menu
          v-model="templateMenu"
          :position-x="x"
          :position-y="y"
          absolute
          offset-y
          :close-on-content-click="false"
        >
          <v-card>
            <v-container>
              <v-layout>     
                <v-autocomplete
                  style="margin-bottom: 0;"
                  label="Instruction template"
                  @input="changeInstruction"
                  v-model="instructionTemplate"
                  :items="instructions"
                  item-text="name"
                  return-object
                  clearable></v-autocomplete>
              </v-layout>
              <v-layout>
                <v-textarea
                  label="Instruction"
                  outline
                  v-model="instructionInEdit"
                  rows="8"
                  class="thinBox"></v-textarea>
              </v-layout>
            </v-container>
            <v-card-actions>
              <v-btn color="primary" flat @click="() => {
                templateMenu = false
                instructionInEdit = ''
              }">Cancel</v-btn>
              <v-spacer></v-spacer>
              <v-btn color="primary" flat @click="() => {
                orderInEdit.instruction = instructionInEdit
                templateMenu = false
                instructionInEdit = ''
              }">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-menu
          v-model="addressMenu"
          :position-x="x"
          :position-y="y"
          absolute
          offset-y
          :close-on-content-click="false"
        >
          <v-card>
            <v-card-text>
              <v-form ref="form-address" lazy-validation>
                <v-layout justify-space-between v-if="addressInEditType === 'to'">
                    <v-flex md5>
                    <v-text-field
                      hide-details
                      label="Recipient name"
                      v-model="addressInEdit.name"
                      :rules="[fieldIsRequired('Recipient name'), fieldCharLimit('Recipient name', 35)]"
                    ></v-text-field>
                  </v-flex>
                  <v-flex md5>
                    <v-text-field
                      label="Company name"
                      v-model="addressInEdit.toCompanyName"
                      hide-details
                      ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-text-field
                      hide-details
                      label="Address 1"
                      v-model="addressInEdit.address1"
                      :rules="[fieldIsRequired('Address1'), fieldCharLimit('address1', 50)]"
                      class="required_field"></v-text-field>
                  </v-flex>
                  <v-flex xs3>
                    <v-text-field
                      hide-details
                      label="Address 2"
                      :rules="[fieldCharLimit('address2', 50)]"
                      v-model="addressInEdit.address2"
                      ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex md3>
                    <v-text-field
                      hide-details
                      label="City"
                      v-model="addressInEdit.city"
                      :rules="[fieldIsRequired('City')]"
                      class="required_field"
                      ></v-text-field>
                  </v-flex>
                  <v-flex md3>
                    <vite-autocomplete
                      hide-details
                      :items="states"
                      v-model="addressInEdit.state"
                      label="State"
                      :rules="[fieldIsRequired('State')]"
                      class="required_field"
                    >
                      <template v-slot:item="data">
                        <template>
                          <v-list-tile-content>
                            <v-list-tile-title :id="data.item">
                              {{data.item}}
                            </v-list-tile-title>
                          </v-list-tile-content>
                        </template>
                      </template>
                    </vite-autocomplete>
                  </v-flex>
                  <v-flex md3>
                    <v-text-field
                      hide-details
                      label="Zip code"
                      v-model="addressInEdit.zipCode"
                      :rules="[fieldIsRequired('Zip code')]"
                      class="required_field"></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex md5>
                    <v-text-field
                      label="Phone"
                      v-model="addressInEdit.phone"
                      hide-details></v-text-field>
                  </v-flex>
                  <v-flex md5 lg3>
                    <v-btn flat color="primary" @click.stop="goToGoogleMapLink"><v-icon>location_on</v-icon>Google Map</v-btn>
                  </v-flex>
                </v-layout>
              </v-form>
            </v-card-text>

            <v-card-actions>
              <v-btn color="primary" flat @click="addressMenu = false">Cancel</v-btn>
              <v-spacer></v-spacer>
              <v-btn color="primary" flat @click="() => addressInEditType === 'from' ? saveAddressFrom() : saveAddressTo()">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-menu
          :close-on-content-click="false"
          v-model="shipDateMenu"
          :position-x="x"
          :position-y="y"
          :nudge-right="40"
          lazy
          transition="scale-transition"
          offset-y
          full-width
          min-width="290px"
        >
          <v-date-picker v-model="orderInEdit.shipDate" @input="shipDateMenu = false"></v-date-picker>
        </v-menu>
      </template>
    </FormSubmitPopup>
    <AddInventories
      title="Select Product"
      v-model="addInventoriesDialog"
      v-if="addInventoriesDialog"
      @showAddProductDialog="(item) => showAddProductDialog(item)"
      @deleteDistribution="(item) => deleteProduct(item)"
      @addDistribution="(item) => addProduct(item)"
      :addedDistributionSet="addedDistributionSet"
      :editMode="true"
      :skus="skus"
      :allDistribution="allDistribution"></AddInventories>
    <LabelTemplatePopup
      v-model="createTemplateDialog" 
      v-if="createTemplateDialog"
      :initTemplate="templateInEdit"
      @submitted="onCreateTemplate"/>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { timeTools, checkRules, cloneDeep, toMoney, uniqueIdGenerator, measurementTools, isObject, gotoGoogleMap } from '@/utils/tools'
import ProductWidget from './ProductWidget'
import AddInventories from './AddInventories'
import InventoryDetails from './InventoryDetails'
import SelectWidget from './SelectWidget'
import LabelTemplatePopup from './LabelTemplatePopup'

export default {
  name: 'BuyLabelPopup',
  components: {
    FormSubmitPopup,
    ProductWidget,
    AddInventories,
    InventoryDetails,
    SelectWidget,
    LabelTemplatePopup
  },
  mixins: [
    checkRules,
    timeTools,
    measurementTools
  ],
  data () {
    let initOrders = {} 
    this.selectedOrders.forEach(order => {
      initOrders[order.orderId] = cloneDeep(order)
      let toShip = {}
      order.items.forEach(item => {
        toShip[item.orderItemId] = item.quantityPurchased - item.quantityShipped
      })
      Object.assign(initOrders[order.orderId], {
        isOz: false,
        weightLb: this.convertWeight(order.weight || 0, order.isMeasurementMetric),
        packaging: (() => 
          (order.length || order.width || order.height) && (order.isMeasurementMetric !== undefined) ? 
            this.convertPackagingSize(order, order.isMeasurementMetric) : 
            {}
        )(),
        insuredValue: order.insuredValue || 0,
        senderName: '',
        fromCompanyName: '',
        toCompanyName: '',
        selectedDistribution: {},
        shipDate: this.toPickerDateString(new Date(order.shipmentDate || Date.now())),
        shipFrom: {},
        signature: order.signatureValue,
        shippingService: order.serviceTypeValue || this.$store.getters.labelDefaultService,
        carrier: this.$store.getters.getCarrierByServiceType(order.serviceType) || this.$store.getters.labelDefaultCarrier,
        template: {},
        templateInEdit: {},
        instruction: '',
        to: {},
        toShip,
        addressTemplate: {}
      })
    })
    return {
      headers: [
        { text: 'Order details', value: 'orderItemId', align: 'left', sortable: false, width: '30%' },
        { text: 'Customer ship option', value: 'productName', align: 'left', sortable: false, width: '20%' },
        { text: 'Selected shipping service', value: '', align: 'left', sortable: false, width: '20%' },
        { text: 'Options', value: '', align: 'left', sortable: false, width: '20%' },
        { text: 'Action', value: '', align: 'center', sortable: false, width: '10%' }
      ],
      pagination: {
        rowsPerPage: 20
      },
      addInventoriesDialog: false,
      addProductDialog: false,
      selectedOrder: {},
      serviceType: '',
      menu: [],
      newSenderName: '',
      orders: initOrders,
      createTemplateDialog: false,
      errorMessages: {},
      warningMessages: {},
      shipFromFlags: {},
      shipToFlags: {},
      instructionFlags: {},
      isLoadingRates: {},
      rates: {},
      addressInEdit: {},
      instructionInEdit: '',
      allDistribution: [],
      keywords: '',
      instructionTemplate: {},
      isLoading: false,
      templateMenu: false,
      addressMenu: false,
      x: 0,
      y: 0,
      addressInEditType: null,
      shipDateMenu: false,
      orderInEdit: {}
    }
  },
  computed: {
    env () {
      return process.env.NODE_ENV
    },
    users () {
      return this.$store.getters.users
    },
    skus () {
      let map = new Map()
      if (!this.selectedOrder) return map
      let {items} = this.selectedOrder
      items.forEach(item => {
        let {sku, quantityShipped, quantityPurchased} = item
        if (!map.has(sku)) {
          map.set(sku, 0)
        }
        map.set(sku, map.get(sku) + quantityPurchased - quantityShipped)
      })
      return map
    },
    addedDistributionSet () {
      return new Set([this.selectedOrder.selectedDistribution.fbmKey])
    },
    siteKeyMap () {
      return this.$store.getters.siteKeyMap
    },
    senderNames () {
      return this.$store.getters.userExtra.senderNames
    },
    packagings () {
      return this.$store.getters.tenantPackagingsWithDefault
    },
    packagingMap () {
      return this.$store.getters.packagingMap
    },
    otherServices () {
      return this.$store.getters.otherServices
    },
    addresses () {
      return this.$store.getters.tenantAddresses
    },
    templates () {
      return this.$store.getters.templates
    },
    statesToAbbrev () {
      return this.$store.getters.statesToAbbrev
    },
    states () {
      return this.$store.getters.stateAbbrevs
    },
    instructions () {
      return this.$store.getters.tenant.instructions || []
    },
    labelServices () {
      return this.$store.getters.labelServices
    },
    shippingServices () {
      return this.labelServices
        .reduce((services, {carrier = '', enableInsured = false, serviceTypes = []}, idx) => [
          ...services, 
          ...serviceTypes,
          { divider: true }
        ], [])
    },
    signatureOptionsMap () {
      return this.labelServices.reduce((map, service) => ({...map, [service.carrier]: service.signatureOptions}), {})
    },
    systemBalance () {
      return this.$store.getters.systemBalance
    },
    flexibleVars () {
      return this.$store.getters.labelTemplateFlexibleVars
    },
    isMeasurementMetric () {
      return !!this.$store.getters.isMeasurementMetric
    },
    sizeSuffix () {
      return this.isMeasurementMetric ? 'cm' : '"'
    }
  },
  mounted () {
    this.autoSelectTemplate()
    Object.values(this.orders).forEach((order) => {
      this.shippingServiceOnChange(order)
      this.$watch(
        () => order, 
        function (val) {
          this.$set(this.errorMessages, order.orderId, '')
          this.$set(this.warningMessages, order.orderId, '')
          if (!Object.values(this.errorMessages).some(item => item)) {
            this.$refs.form.clearAlert()
          }
        },
        { deep: true }
      )
    })
  },
  methods: {
    isObject,
    showTemplateDialog (item) {
      if (item.items.length > 1) return alert('Multiple items template is not supported this time.')
      this.createTemplateDialog = true
      this.selectedOrder = item
      this.templateInEdit = {
        sku: item.items[0].sku
      }
    },
    generateQty (qty) {
      let rtn = []
      for (let i = 0; i <= qty; i++) {
        rtn[i] = i
      }
      return rtn
    },
    removeOrder (item) {
      if (!confirm('Are you sure to remove this order?')) return
      this.$delete(this.orders, item.orderId)
    },
    showAddInventoriesDialog (order) {
      this.selectedOrder = order
      this.addInventoriesDialog = true
    },
    showAddProductDialog (product) {
      this.productInEdit = product
      this.addProductDialog = true
    },
    extractLabelPayload (item) {
      let {
        signature, 
        weightLb,
        packaging: pkging,
        shipDate, 
        shippingService,
        senderName,
        fromCompanyName = '',
        recipientName,
        toCompanyName = '',
        shipAddress1,
        shipAddress2,
        shipCity,
        shipPostalCode,
        shipState,
        orderId,
        shipFrom,
        enableInsured,
        insuredValue,
        isOz,
        memo = '',
        buyerPhoneNumber,
        carrier,
        reference = ''
      } = item
      if (recipientName.length > 35) throw Error(`Recipient name are limited to less or eqaul to 35 charactors.`)
      if (JSON.stringify(shipFrom) === '{}') throw Error(`Please assign ship from info for this order.`)
      let packaging = {
        signature,
        insuredValue: enableInsured ? insuredValue : 0,
        weight: isOz ? (weightLb / 16) : weightLb,
        ...pkging
      }
      const [serviceType, channel = 'KSAE'] = shippingService.split(' - ')
      return {
        carrier,
        packaging,
        packages: [packaging],
        from: {
          ...shipFrom,
          fullName: senderName,
          company: fromCompanyName
        },
        to: {
          fullName: recipientName,
          address1: shipAddress1,
          address2: shipAddress2 || '',
          city: shipCity,
          zipCode: shipPostalCode.slice(0, 5),
          state: shipState,
          phone: buyerPhoneNumber,
          company: toCompanyName
        },
        signature,
        shipDate,
        shippingService,
        serviceType,
        channel,
        weight: isOz ? (weightLb / 16) : weightLb,
        note: reference.trim() || `Label for order ${orderId}`,
        memo,
        keywords: this.keywords,
        isMeasurementMetric: this.isMeasurementMetric
      }
    },
    getRate (orderId) {
      try {
        const relatedFormKeys = Object.keys(this.$refs).filter(item => item.startsWith(`form-${orderId}`))

        const validateResults = relatedFormKeys.map(key => this.$refs[key].validate ? this.$refs[key].validate() : this.$refs[key][0].validate())
        if (validateResults.some(item => !item)) return Promise.resolve()

        let payload = this.extractLabelPayload(this.orders[orderId])
        this.systemBalance.discount && (payload.discount = this.systemBalance.discount)
        this.$set(this.isLoadingRates, orderId, true)
        this.$set(this.rates, orderId, null)
        return this.$store.dispatch('getRates', payload)
          .then(rtn => {
            if (rtn.data.notMatch) {
              this.$set(this.warningMessages, orderId, `The recipient's address is ambiguous, missing required information, or doesn't exist.`)
            } else if (rtn.data.isCleansed) {
              let {
                address1,
                city,
                state,
                zipCode
              } = rtn.data
              this.$set(this.warningMessages, orderId, `Recommended recipient address: ${address1}, ${city}, ${state} ${zipCode}`)
            }
            this.$set(this.rates, orderId, this.setRates(rtn.data))
          })
          .catch(error => {
            return this.$set(this.errorMessages, orderId, error.message)
          })
          .finally(() => {
            this.$set(this.isLoadingRates, orderId, false)
          })
      } catch (error) {
        this.$set(this.errorMessages, orderId, error.message)
      }
    },
    randomNumGenerator (length) {
      let rtn = ''
      for (let i = 0; i < length; i++) {
        rtn += Math.floor(Math.random() * 10)
      }
      return rtn
    },
    async onSubmitted () {
      this.isLoading = true
      let labels
      try {
        const originOrderQty = Object.keys(this.orders).length
        const validatedOrderKeys = Object.keys(this.orders)
          .map(orderId => {
            const relatedFormKeys = Object.keys(this.$refs).filter(item => item.startsWith(`form-${orderId}`))
            const validateResults = relatedFormKeys.map(key => {
              if (this.$refs[key].validate) {
                return this.$refs[key].validate()
              }
              return this.$refs[key][0].validate()
            })
            if (validateResults.some(item => !item)) return ''
            return orderId
          })
          .filter(orderId => !!orderId)
        if (validatedOrderKeys.length < originOrderQty) throw Error(`Note: Please check errors.`)

        const randomIds = uniqueIdGenerator(validatedOrderKeys.length)
        labels = validatedOrderKeys.map((orderId, index) => {
          const order = this.orders[orderId]
          const {items, toShip} = order
          const requestId = order.requestId || (randomIds[index] + `B${this.randomNumGenerator(2)}`)
          const payload = this.extractLabelPayload(order)
          return {
            ...payload,
            requestId,
            orderKey: this.orders[orderId]._key,
            keywords: this.keywords,
            order: {
              orderId, 
              items, 
              toShip
            }
          }
        })

        const res = await this.$store.dispatch('addOrderLabels', {
          labels,
          keywords: this.keywords
        })

        const {successLabels = [], existedLabels = [], errorLabels = []} = res
        successLabels.forEach(item => {
          const orderId = item.orderKey.split('-').slice(1).join('-')
          this.$delete(this.orders, orderId)
        })

        existedLabels.forEach(item => {
          const orderId = item.orderKey.split('-').slice(1).join('-')
          this.$delete(this.orders, orderId)
        })

        errorLabels.forEach(item => {
          const orderId = item.orderKey.split('-').slice(1).join('-')
          this.$set(this.errorMessages, orderId, item.message)
        })
        if (errorLabels.length > 0) throw Error(`Note: Please check remaining orders' error.`)
        this.$emit('submitted') 
        this.isLoading = false
      } catch (error) {
        this.isLoading = false
        labels && (labels.forEach(label => {
          const {requestId, orderKey} = label
          const orderId = orderKey.split('-').slice(1).join('-')
          this.orders[orderId] && (this.orders[orderId].requestId = requestId)
        }))
        if (error.message === 'endpoint-request-timed-out') {
          throw Error('Endpoint request timed out. Please retry.')
        }
        throw error
      }
    },
    onSelectTemplate (orderId, event) {
      const {from = {}, createTime, selectedOtherServices, lastModifiedTime, memo, sku, packaging, weightLb, isMeasurementMetric = false, ...rest} = event
      let replacedMemo = this.flexibleVars.reduce((acc, variable) => {
        return acc.replace(new RegExp(`#{${variable}}`, 'g'), this.orders[orderId][variable])
      }, memo)
      Object.assign(this.orders[orderId], {
        senderName: from.fullName, 
        memo: replacedMemo, 
        fromCompanyName: from.company, 
        weightLb: this.convertWeight(weightLb, isMeasurementMetric),
        isMeasurementMetric: this.isMeasurementMetric,
        ...rest
      })

      const {height, length, width, isMeasurementMetric: isPackagingMeasurementMetric = false, ...pkgRest} = this.packagingMap.get(packaging)
      this.$set(this.orders[orderId], 'packaging', {
        ...this.convertPackagingSize({height, length, width}, isPackagingMeasurementMetric),
        ...pkgRest
      })
      this.$nextTick(() => {
        this.orders[orderId].selectedOtherServices = [...selectedOtherServices]
        this.shippingServiceOnChange(this.orders[orderId])
      })
    },
    autoSelectTemplate () {
      Object.values(this.orders).forEach(order => {
        let target = this.templates.find(template => order.items.some(item => item.sku === template.sku))
        
        if (target) {
          this.orders[order.orderId].template = target
          this.onSelectTemplate(order.orderId, target)
        }
      })
    },
    onCreateTemplate (template) {
      this.orders[this.selectedOrder.orderId].template = template
      this.onSelectTemplate(this.selectedOrder.orderId, template)
    },
    changeInstruction (e) {
      this.instructionInEdit = e.content
    },
    onSelectAddress (e, orderId) {
      if (JSON.stringify(e) !== '{}') {
        this.$set(this.orders[orderId], 'shipFrom', e)
        if (!Object.keys(this.orders[orderId].template).length) {
          this.$set(this.orders[orderId], 'senderName', e.fullName)
          this.$set(this.orders[orderId], 'fromCompanyName', e.company)
        }
      }
    },
    applyShipFromToAll (shipFrom, addressTemplate, senderName, companyName) {
      Object.keys(this.orders).forEach(orderId => {
        this.$set(this.orders[orderId], 'shipFrom', {...shipFrom})
        this.$set(this.orders[orderId], 'addressTemplate', {...addressTemplate})
        if (!Object.keys(this.orders[orderId].template).length) {
          this.$set(this.orders[orderId], 'senderName', senderName)
          this.$set(this.orders[orderId], 'fromCompanyName', companyName)
        }
      })
    },
    setEnableInsured (item) {
      item.enableInsured = (this.labelServices.find(service => service.carrier === item.carrier) || {}).enableInsured
    },
    getCarrier (item) {
      return (this.labelServices.find(service => 
        service.serviceTypes.findIndex(serviceType => 
          item.shippingService === serviceType.value
        ) >= 0
      ) || {}).carrier
    },
    checkSignatureValue (item) {
      const signatureOpts = this.signatureOptionsMap[item.carrier]
      let defaultValue = signatureOpts[0].value || ''
      for (let option of signatureOpts) {
        if (option.default) defaultValue = option.value
        if (option.value === item.signature) return
      }
      item.signature = defaultValue
    },
    shippingServiceOnChange (item) {
      this.$set(item, 'carrier', this.getCarrier(item))
      this.setEnableInsured(item)
      this.checkSignatureValue(item)
      item.insuredValue = (this.labelServices
        .find(service => service.carrier === item.carrier) || {}).enableInsured ? item.insuredValue : 0
    },
    setRates (data) {
      const {postageAmount, ...surcharges} = data.amountDetails
      const surcharge = Object.values(surcharges).reduce((a, b) => toMoney(a + b), 0)
      return {
        total: toMoney(postageAmount + surcharge),
        rate: postageAmount,
        surcharge,
        isResidential: !!data.isResidential
      }
    },
    saveAddressFrom () {
      if (JSON.stringify(this.addressInEdit) !== '{}' && this.$refs[`form-address`].validate()) {
        this.orderInEdit.shipFrom = this.addressInEdit
        this.addressInEdit = {}
        this.addressMenu = false
      }
    },
    saveAddressTo () {
      if (JSON.stringify(this.addressInEdit) !== '{}' && this.$refs[`form-address`].validate()) {
        const {
          name: recipientName,
          address1: shipAddress1,
          address2: shipAddress2,
          city: shipCity,
          zipCode: shipPostalCode,
          state: shipState,
          phone: buyerPhoneNumber,
          toCompanyName
        } = this.addressInEdit
        Object.assign(this.orderInEdit, {
          recipientName,
          shipAddress1,
          shipAddress2,
          shipCity,
          shipPostalCode,
          shipState,
          buyerPhoneNumber,
          toCompanyName
        })
        this.addressMenu = false
      }
    },
    showInstruction (e, order) {
      e.preventDefault()
      this.templateMenu = false
      this.x = e.clientX
      this.y = e.clientY
      this.$nextTick(() => {
        this.templateMenu = true
      })
      this.orderInEdit = order
      this.instructionInEdit = order.instruction
      this.instructionTemplate = {}
    },
    showEditAddressTo (e, order) {
      e.preventDefault()
      this.addressMenu = false
      this.x = e.clientX
      this.y = e.clientY
      this.$nextTick(() => {
        this.addressMenu = true
      })
      const {
        recipientName: name,
        shipAddress1: address1,
        shipAddress2: address2,
        shipCity: city,
        shipPostalCode: zipCode,
        shipState: state,
        buyerPhoneNumber: phone,
        toCompanyName
      } = order
      this.addressInEdit = {
        name,
        address1,
        address2,
        city,
        zipCode,
        state,
        phone,
        toCompanyName
      }
      this.orderInEdit = order
      this.addressInEditType = 'to'
    },
    showEditAddressFrom (e, order) {
      e.preventDefault()
      this.addressMenu = false
      this.x = e.clientX
      this.y = e.clientY
      this.$nextTick(() => {
        this.addressMenu = true
      })
      this.addressInEdit = {...order.shipFrom}
      this.orderInEdit = order
      this.addressInEditType = 'from'
    },
    showEditDate (e, order) {
      e.preventDefault()
      this.shipDateMenu = false
      this.x = e.clientX
      this.y = e.clientY
      this.$nextTick(() => {
        this.shipDateMenu = true
      })
      this.orderInEdit = order
    },
    goToGoogleMapLink () {
      gotoGoogleMap(this.addressInEdit)
    },
    onSelectPackaging (e, item) {
      const {height, length, width} = e
      this.$set(item, 'packaging', {height, length, width})
      this.menu = []
    }
  },
  props: {
    value: Boolean,
    selectedOrders: {
      type: Array,
      default: () => []
    }
  }
}
</script>
