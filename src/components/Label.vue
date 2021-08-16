<template>
  <v-container fluid>
    <v-tabs
      color="transparent"
      v-model="tab"
      show-arrows
    >
      <v-tabs-slider color="primary"></v-tabs-slider>
      <v-layout align-center justify-space-between>
        <span>
          <v-tab v-for="tabItem in tabs" :key="tabItem">
            {{ tabItem }}
          </v-tab>
        </span>
        <span>
          Balance: $ {{ systemBalance.balance }}
        </span>
      </v-layout>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item>
          <v-layout>
            <v-flex xs3 md2>
              <v-btn dark color="primary" @click.stop="showCreateLabelDialog"><v-icon dark>add</v-icon>Domestic Label</v-btn>
            </v-flex>
            <v-flex xs3 md2>
              <v-btn dark color="primary" @click.stop="showCreateLabelInternationalDialog"><v-icon dark>add</v-icon>International label</v-btn>
            </v-flex>
          </v-layout>
          <PaginationController
            v-model="labels"
            getDataActionName="getLabelPagination"
            :historyLimit="historyLimit"
            :haveSearchBox="true"
            :select="labelStatus"
            searchBoxLabel="Search"
            searchBoxHint="Memo/Recipient/Service type/Tracking"
            haveStartDate
          >
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="labels"
                hide-actions
                item-key="_key"
                select-all="blue"
                v-model="selectedFilteredLabels"
              >
                <template v-slot:items="props">
                  <td class="checkbox-align-center" @click="props.item.url && props.item.status !== 'canceled' && (props.selected = !props.selected)">
                    <v-layout>
                      <v-checkbox
                        :disabled="!props.item.url || props.item.status === 'canceled'"
                        @click.stop="() => { props.selected = !props.selected }"
                        :value="props.selected"
                        primary
                        hide-details
                      ></v-checkbox>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">
                    <v-layout wrap v-if="props.item.type">
                      <span class="font-weight-bold">Type:&nbsp; </span>{{ props.item.type }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.orderId">
                      <span class="font-weight-bold">ID:&nbsp; </span> {{ props.item._key }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.shipmentId">
                      <span class="font-weight-bold">Shipment ID:&nbsp; </span> {{ props.item.shipmentId }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.itn">
                      <span class="font-weight-bold">ITN:&nbsp; </span> {{ props.item.itn }}
                    </v-layout>
                    <v-layout>
                      <v-flex md6 v-if="props.item.packaging && JSON.stringify(props.item.packaging) !== '{}'">
                        <span class="font-weight-bold">Size(L/W/H): </span> {{displayPackaging(props.item.packages[0])}}
                      </v-flex>
                      <v-flex md1></v-flex>
                      <v-flex md4 v-if="props.item.weight">
                        <span class="font-weight-bold">Weight: </span> {{ props.item.weight }}{{props.item.isMeasurementMetric ? 'kg' : 'lbs'}}
                      </v-flex>
                    </v-layout>
                    <v-layout v-if="props.item.insuredValue">
                      <span class="font-weight-bold text-capitalize">Declared value:&nbsp; </span> {{ props.item.insuredValue }}
                    </v-layout>
                    <v-layout v-if="props.item.signature" class="text-capitalize">
                      <span class="font-weight-bold text-capitalize">Signature:&nbsp; </span> {{ signatureValueToTextMap.get(`${props.item.carrier.toLowerCase()}_${props.item.signature}`) }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.memo">
                      <span class="font-weight-bold">Memo:&nbsp; </span>{{ props.item.memo }}
                    </v-layout>
                    <v-layout wrap v-if="props.item.note" style="overflow-wrap: break-word; word-break: break-all;">
                      <span class="font-weight-bold">Note:&nbsp; </span><span>{{ props.item.note }}</span>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">
                    <LabelAddressWidget
                      :address="props.item.from"/>
                  </td>
                  <td class="text-xs-left">
                    <LabelAddressWidget
                      :address="props.item.to"/>
                  </td>
                  <td v-if="$store.getters.activeWarehouse" class="text-xs-left">
                    {{ organizationKeyToId.get(props.item.clientKey) }}
                  </td>
                  <td class="text-xs-left">
                    <v-layout>
                      {{ toDateYYYYMMDD(props.item.createTime) }}
                    </v-layout>
                    <v-layout>
                      {{ props.item.shipDate }}
                    </v-layout>
                    <v-layout v-if="props.item.estimatedDelivery && props.item.estimatedDelivery !== 'N/A'" class="text-capitalize">
                      <v-flex v-if="typeof props.item.estimatedDelivery === 'string'">{{ 
                        toDateYYYYMMDD(new Date(props.item.estimatedDelivery)) 
                      }}</v-flex>
                      <v-flex v-else>{{ toDateYYYYMMDD(props.item.estimatedDelivery) }}</v-flex>
                    </v-layout>
                  </td>
                  <td class="text-xs-left">
                    <LabelTrackingDetailWidget 
                      v-if="props.item.status !== 'failed'"
                      :trackingNumber="props.item.trackingNumber"
                      :status="props.item.status"
                      :carrier="props.item.carrier"
                      :details="props.item.trackingDetails"
                    />
                    <div v-else>
                      <p :key="messageItem.time" v-for="messageItem in props.item.messages" >
                        {{messageItem.message}}
                      </p>
                    </div>
                  </td>
                  <td class="text-xs-left">
                    <v-layout v-if="props.item.carrier">
                      <strong>{{ props.item.carrier }}</strong>
                    </v-layout>
                    <v-layout>
                      {{ props.item.serviceDescription }}
                    </v-layout>
                  </td>
                  <td :class="props.item.totalAmount ? 'text-xs-left fontRed' : (props.item.amount > 0 ? 'text-xs-left fontGreen' : 'text-xs-left fontRed')">
                    ${{ -props.item.totalAmount || props.item.amount || 0 }}
                  </td>
                  <td class="text-xs-left">{{ props.item.status || 'ready' }}</td>
                  <td class="text-xs-center">
                    <v-layout row justify-center>
                      <span v-if="props.item.status === 'pending' && env !== 'production'">
                        <LoaderButton
                          flat
                          :promiseAwait="getLabelStatus"
                          :promiseItem="props.item"
                        >
                          <template v-slot:icon>
                            <v-icon>refresh</v-icon>
                          </template>
                        </LoaderButton>
                      </span>
                      <span v-else>
                        <v-tooltip top>
                          <template v-slot:activator="tooltip">
                            <div v-on="tooltip.on">
                              <v-btn 
                                flat 
                                icon
                                color="primary" 
                                @click.stop="downloadFile(props.item.url, props.item.orderId)"
                                :disabled="!props.item.url || ['canceled', 'failed'].includes(props.item.status)"
                              ><v-icon>preview</v-icon></v-btn>
                            </div>
                          </template>
                          Open label
                        </v-tooltip>
                      </span>
                      <span>
                        <v-menu offset-y>
                          <template v-slot:activator="{ on }">
                            <v-tooltip top>
                              <template v-slot:activator="tooltip">
                                <div v-on="tooltip.on">
                                  <v-btn @click.stop="on.click" dark icon flat color="primary">
                                    <v-icon>build</v-icon>
                                  </v-btn>
                                </div>
                              </template>
                              More
                            </v-tooltip>
                          </template>
                          <v-list>
                            <v-list-tile @click.stop="showEditLabelDialog(props.item)">
                              <v-list-tile-title class="text-xs-center">Edit note</v-list-tile-title>
                            </v-list-tile>
                            <v-list-tile 
                              v-if="props.item.carrier !== 'USPS' &&
                                (props.item.status === 'ready' || props.item.status === 'pending') &&
                                (props.item.requestId === props.item._key)"
                            >
                              <LoaderButton
                                flat
                                buttonText="Cancel"
                                :promiseAwait="cancelLabel"
                                :promiseItem="props.item"                        
                              ></LoaderButton>
                            </v-list-tile>
                          </v-list>
                        </v-menu>
                      </span>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-slot:afterDate>
              <v-flex>
                <v-layout align-center justify-end>
                  <v-flex xs5>
                    <v-switch :label="isMergePDF ? 'PDF' : 'ZIP'" v-model="isMergePDF"></v-switch>
                  </v-flex>
                  <v-flex xs6>
                    <LoaderButton
                      isSmall
                      :buttonText="`Download labels(${selectedLabels.length})`"
                      :promiseAwait="downloadSelectedLabelAndZip"
                      :disabled="selectedLabels.length === 0"/>
                  </v-flex>
                </v-layout>
              </v-flex>
            </template>
            <template v-slot:beforeSearchBox>
              <v-flex xs4>
                <v-autocomplete
                  :items="labelStatusArray"
                  item-value="value"
                  item-text="name"
                  v-model="labelStatus"
                  label="Label status"></v-autocomplete>
              </v-flex>
              <v-flex md1></v-flex>
            </template>
          </PaginationController>
        </v-tab-item>
        <v-tab-item>
          <v-layout>
            <v-flex xs2>
              <v-btn dark color="primary" @click.stop="showCreateAddressDialog"><v-icon dark>add</v-icon>Address</v-btn>
            </v-flex>
            <v-flex xs1 v-if="enableAmazonSites">
              <v-switch v-model="isOnlyShowCustomSites" :label="isOnlyShowCustomSites ? 'Custom' : 'All'"></v-switch>
            </v-flex>
          </v-layout>
          <v-container fluid grid-list-lg>
            <v-layout wrap>
              <v-flex md2 v-for="address in addressesDisplay" :key="address.siteName">
                <LabelAddressCard
                  :address="address"
                  @delete="deleteAddress(address)"
                  @edit="showEditAddressDialog(address)"/>
              </v-flex>
            </v-layout>
          </v-container>
        </v-tab-item>
        <v-tab-item>
          <v-layout justify-space-between>
            <v-flex md2>
              <v-btn dark color="primary" @click.stop="showAddPackagingDialog"><v-icon dark>add</v-icon>Packaging</v-btn>
            </v-flex>
            <v-flex md2>
              <v-text-field
                append-icon="filter_list"
                class="text-xs-right"
                label="Search"
                single-line
                hide-details
                v-model="filter"
                clearable
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-data-table
            :headers="packagingHeaders"
            :items="packagings"
            class="my-1 levation-2 myDense"
            :rows-per-page-items="rowPerPage"
            :search="filter"
          >
            <template v-slot:items="props">
              <td class="subheading">{{ props.index + 1}}</td>
              <td class="text-xs-left">{{ props.item.name }}</td>
              <td class="text-xs-left">{{ props.item.length }} {{ props.item.isMeasurementMetric ? 'cm' : '"' }}</td>
              <td class="text-xs-left">{{ props.item.width }} {{ props.item.isMeasurementMetric ? 'cm' : '"' }}</td>
              <td class="text-xs-left">{{ props.item.height }} {{ props.item.isMeasurementMetric ? 'cm' : '"' }}</td>
              <td class="text-xs-right">
                <v-layout row>
                  <v-flex><v-btn dark color="primary" flat @click.stop="showEditPackagingDialog(props.item)">Edit</v-btn></v-flex>
                  <v-flex><v-btn dark color="primary" flat @click.stop="deletePackaging(props.item)">Delete</v-btn></v-flex>
                </v-layout>
              </td>
            </template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-layout justify-space-between>
            <v-flex md2>
              <v-btn dark color="primary" @click.stop="showTemplateDialog()"><v-icon dark>add</v-icon>Template</v-btn>
            </v-flex>
            <v-flex md2>
              <v-text-field
                append-icon="filter_list"
                class="text-xs-right"
                label="Search"
                single-line
                hide-details
                v-model="filter"
                clearable
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-data-table
            :headers="templateHeaders"
            :items="templates"
            item-key="name"
            class="my-1 levation-2 myDense"
            :rows-per-page-items="rowPerPage"
            :search="filter"
          >
            <template v-slot:items="props">
              <td class="text-xs-left">
                {{ props.item.name }}               
              </td>
              <td class="text-xs-left">{{ props.item.from && props.item.from.fullName }}</td>
              <td class="text-xs-left">{{ props.item.sku }}</td>
              <td class="text-xs-left">
                <v-layout wrap v-if="props.item.note">
                  <span class="font-weight-bold">Note:&nbsp; </span>{{ props.item.note }}
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex md6 v-if="packagingMap.has(props.item.packaging)">
                    <span class="font-weight-bold">Size(L/W/H): </span>{{displayPackaging(packagingMap.get(props.item.packaging))}}
                  </v-flex>
                  <v-flex md6>
                    <span class="font-weight-bold">Weight: </span> {{ props.item.weightLb }}{{props.item.isMeasurementMetric ? 'kg' : 'lbs'}}
                  </v-flex>
                </v-layout>
                <v-layout  class="text-capitalize">
                  <span class="font-weight-bold">Signature:&nbsp; </span> {{ props.item.signature }}
                </v-layout>
                <v-layout wrap v-if="props.item.memo">
                  <span class="font-weight-bold">Memo:&nbsp; </span>{{ props.item.memo }}
                </v-layout>
              </td>
              <td class="text-xs-left">{{ props.item.shippingService }}</td>
              <td class="text-xs-left">{{ props.item.isExpedited ? 'Expedite' : 'Normal' }}</td>
              <td class="text-xs-left">
                <v-chip v-for="item in props.item.selectedOtherServices" :key="item">{{item}}</v-chip>
              </td>
              <td class="text-xs-center">
                <v-layout row>
                  <v-flex>
                    <v-btn 
                      dark 
                      flat 
                      color="primary" 
                      @click.stop="showTemplateDialog(props.item)"
                    >Edit</v-btn>
                  </v-flex>
                  <v-flex>
                    <v-btn 
                      dark 
                      flat 
                      color="primary" 
                      @click.stop="deleteTemplate(props.item)"
                    >Delete</v-btn>
                  </v-flex>
                </v-layout>
              </td>
            </template>
          </v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>

    <LabelCreatePopup
      v-model="createLabelDialog" 
      v-if="createLabelDialog"
      :froms="addresses"
      :idGenerator="labelIdGenerator"
      @submitted="updateLabelStatus"/>
    <LabelTemplatePopup
      v-model="createTemplateDialog" 
      v-if="createTemplateDialog"
      :initTemplate="templateInEdit"/>
    <LabelCreateAddress
      v-model="createAddressDialog"
      v-if="createAddressDialog"
      :actionFunc="addressFunc"
      :address="addressInEdit"
      :siteNames="siteNames"></LabelCreateAddress>
    <FormSubmitPopup
      title="Packaging"
      v-model="packagingDialog"
      v-if="packagingDialog"
      medium
      @popupClose="packagingDialog = false"
      :rightMethod="editPackaging"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex>
              <v-text-field
                label="Name"
                :rules="[fieldIsRequired()]"
                v-model="packagingInEdit.name"
                :disabled="isEdit"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Length"
                :rules="[fieldIsRequired(), fieldIsInteger(), fieldIsOverZero(), fieldIsInteger()]"
                v-model.number="packagingInEdit.length"
                :suffix="isMeasurementMetric ? 'cm' : 'inch'"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Width"
                :rules="[fieldIsRequired(), fieldIsInteger(), fieldIsOverZero(), fieldIsInteger()]"
                v-model.number="packagingInEdit.width"
                :suffix="isMeasurementMetric ? 'cm' : 'inch'"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Height"
                :rules="[fieldIsRequired(), fieldIsInteger(), fieldIsOverZero(), fieldIsInteger()]"
                v-model.number="packagingInEdit.height"
                :suffix="isMeasurementMetric ? 'cm' : 'inch'"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <FormSubmitPopup
      title="Edit note"
      v-model="editLabelDialog"
      v-if="editLabelDialog"
      medium
      @popupClose="editLabelDialog = false"
      :rightMethod="editLabel"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex>
              <v-text-field
                label="Note"
                :rules="[fieldCharLimit('Note', 100)]"
                v-model="labelInEdit.note"
                counter="100"></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <LabelCreateInternationalPopup
      v-model="createLabelInternationalDialog" 
      v-if="createLabelInternationalDialog"
      :froms="addresses"
      :idGenerator="labelIdGenerator"
      @submitted="updateLabelStatus"/>
  </v-container>
</template>

<script>
import LabelCreatePopup from './LabelCreatePopup'
import LabelCreateInternationalPopup from './LabelCreateInternationalPopup'
import LabelTemplatePopup from './LabelTemplatePopup'
import LabelAddressWidget from './LabelAddressWidget'
import LabelCreateAddress from './LabelCreateAddress'
import LabelAddressCard from './LabelAddressCard'
import PaginationController from './PaginationController'
import LoaderButton from './LoaderButton'
import FormSubmitPopup from './FormSubmitPopup'
import LabelTrackingDetailWidget from './LabelTrackingDetailWidget'
import { checkRules, timeTools, getRandomIdByTime, measurementTools } from '../utils/tools'

export default {
  name: 'Label',
  components: {
    PaginationController,
    LabelCreatePopup,
    LabelAddressCard,
    LabelAddressWidget,
    LabelCreateAddress,
    LoaderButton,
    FormSubmitPopup,
    LabelTemplatePopup,
    LabelTrackingDetailWidget,
    LabelCreateInternationalPopup
  },
  mixins: [checkRules, timeTools, measurementTools],
  data () {
    return {
      tab: null,
      tabs: [
        'Label', 'Address', 'Packaging', 'Template'
      ],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      createLabelDialog: false,
      headers: this.$store.getters.activeWarehouse ? [
        { text: 'Details', value: 'signature', align: 'left', sortable: false, width: '20%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Creator', value: 'clientKey', align: 'left', sortable: false },
        { text: 'Create/Ship/Est delivery date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Tracking/Info', value: 'trackingNumber', align: 'left', sortable: false },
        { text: 'Service', value: 'shippingService', align: 'left', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Status', value: 'status', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false }
      ] : [
        { text: 'Details', value: 'signature', align: 'left', sortable: false, width: '20%' },
        { text: 'From', value: 'from', align: 'left', sortable: false },
        { text: 'To', value: 'to', align: 'left', sortable: false },
        { text: 'Create/Ship/Est delivery date', value: 'createTime', align: 'left', sortable: false },
        { text: 'Tracking/Info', value: 'trackingNumber', align: 'left', sortable: false },
        { text: 'Service', value: 'shippingService', align: 'left', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Status', value: 'status', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false }
      ],
      templateHeaders: [
        { text: 'Name', value: 'name', align: 'left', sortable: false, width: '25%' },
        { text: 'Sender name', value: 'sku', align: 'left', sortable: false },
        { text: 'Sku', value: 'sku', align: 'left', sortable: false },
        { text: 'Details', value: 'signature', align: 'left', sortable: false },
        { text: 'Service type', value: 'serviceType', align: 'left', sortable: false },
        { text: 'Shipping service', value: 'shippingService', align: 'left', sortable: false },
        { text: 'Other services', value: 'selectedOtherServices', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false, width: '10%' }
      ],
      packagingHeaders: [
        { text: '#', value: 'id', align: 'left', sortable: false },
        { text: 'Name', value: 'name', align: 'left', sortable: false },
        { text: 'Length', value: 'length', align: 'left', sortable: false },
        { text: 'Width', value: 'width', align: 'left', sortable: false },
        { text: 'Height', value: 'height', align: 'left', sortable: false },
        { text: 'Actions', value: '', align: 'center', sortable: false, width: '10%' }
      ], 
      historyLimit: 25,
      productInEdit: {},
      refresh: false,
      labels: [],
      createAddressDialog: false,
      addressInEdit: {},
      packagingInEdit: {},
      packagingDialog: false,
      editLabelDialog: false,
      labelInEdit: {},
      createTemplateDialog: false,
      isEdit: false,
      selectedLabels: [],
      filter: '',
      labelStatusArray: [
        {name: '-- All --', value: ''},
        {name: 'Pending', value: 'pending'},
        {name: 'Ready', value: 'ready'},
        {name: 'In transit', value: 'in transit'},
        {name: 'Delivered', value: 'delivered'},
        {name: 'Canceled', value: 'canceled'}
      ],
      labelStatus: '',
      isMergePDF: false,
      isOnlyShowCustomSites: true,
      createLabelInternationalDialog: false
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
      this.filter = ''
    }
  },
  computed: {
    selectedFilteredLabels: {
      get: function () {
        return this.selectedLabels
      },
      set: function (val) {
        this.selectedLabels = val.filter(item => item.url && item.status !== 'canceled')
      }
    },
    env () {
      return process.env.NODE_ENV
    },
    isMeasurementMetric () {
      return this.$store.getters.isMeasurementMetric
    },
    enableAmazonSites () {
      return this.$store.getters.enableAmazonSites
    },
    addressesDisplay () {
      if (this.isOnlyShowCustomSites) {
        return this.addresses.filter(item => !item.isAmazon)
      }
      return this.addresses
    },
    addresses () {
      return this.$store.getters.tenantAddresses
    },
    siteNames () {
      let names = new Set(this.addresses.map(item => item.siteName))
      names.delete(this.addressInEdit.siteName)
      return names
    },
    organizationKeyToId () {
      return this.$store.getters.organizationKeyToId
    },
    packagings () {
      return this.$store.getters.tenantPackagings
    },
    packagingMap () {
      return this.$store.getters.packagingMap
    },
    templates () {
      return this.$store.getters.templates
    },
    systemBalance () {
      return this.$store.getters.systemBalance
    },
    signatureValueToTextMap () {
      // carrier + value to be the key, text to be the value
      return new Map(this.$store.getters.labelServices.map(item => {
        let {carrier, signatureOptions} = item
        return signatureOptions.map(item => [`${carrier.toLowerCase()}_${item.value}`, item.text])
      }).flat())
    },
    isRestrictInternationalLabel () {
      return this.$store.getters.isRestrictInternationalLabel
    }
  },
  methods: {
    labelIdGenerator (qty) {
      let idSet = new Set()
      while (idSet.size < qty) {
        idSet.add(getRandomIdByTime(3))
      }
      return [...idSet]
    },
    showAddPackagingDialog () {
      this.packagingDialog = true
      this.packagingInEdit = {}
      this.isEdit = false
    },
    showEditPackagingDialog (item) {
      this.packagingDialog = true
      this.packagingInEdit = {
        ...item,
        ...this.convertPackagingSize(item, item.isMeasurementMetric, true),
        isMeasurementMetric: this.isMeasurementMetric
      }
      this.isEdit = true
    },
    editPackaging () {
      const {packagingInEdit, isEdit, isMeasurementMetric} = this
      if (this.packagings.some(pkg => pkg.name === packagingInEdit.name)) {
        if (!isEdit && !confirm('Packaging name already defined, do you want to overwrite existed packaging?')) return 
      }
      return this.$store.dispatch('editPackaging', {packagingInEdit: {...packagingInEdit, isMeasurementMetric}, isEdit})
    },
    deletePackaging (item) {
      if (!confirm('Are you sure to delete this packaging?')) return Promise.resolve()
      return this.$store.dispatch('deletePackaging', item)
    },
    showCreateLabelDialog (item) {
      this.createLabelDialog = true
    },
    showCreateLabelInternationalDialog () {
      if (this.isRestrictInternationalLabel && prompt('Please enter access code') !== 'vite12345') return
      this.createLabelInternationalDialog = true
    },
    showCreateAddressDialog () {
      this.createAddressDialog = true
      this.addressFunc = this.createAddress
      this.addressInEdit = {}
    },
    showEditLabelDialog (item) {
      this.editLabelDialog = true
      this.labelInEdit = {...item}
      this.labelInEdit._key = this.labelInEdit._key || item.requestId
    },
    createAddress (address) {
      return this.$store.dispatch('labelCreateAddress', {addresses: [address]})
    },
    editAddress (address) {
      return this.$store.dispatch('labelEditAddress', address)
    },
    editLabel () {
      return this.$store.dispatch('editLabel', this.labelInEdit)
        .then(() => {
          let target = this.labels.find(item => item._key === this.labelInEdit._key)
          this.$set(target, 'note', this.labelInEdit.note)
        })
    },
    showEditAddressDialog (address) {
      this.createAddressDialog = true
      this.addressInEdit = address
      this.addressFunc = this.editAddress
    },
    deleteAddress (address) {
      if (!confirm('Are you sure to delete this address?')) return Promise.resolve()
      return this.$store.dispatch('labelDeleteAddress', address)
    },
    getLabelStatus (label) {
      return this.$store.dispatch('getLabelStatus', label)
        .then((rtn) => {
          if (!rtn.data.code) {
            rtn.data.map(label => {
              if (label.status === 'OK') {
                const idx = this.labels.findIndex(item => item.orderId === label.orderId)
                this.$set(this.labels, idx, {...this.labels[idx], ...label, status: 'ready'})
              }
            })
          }
        })
    },
    downloadFile (url, orderId) {
      window.open(url)
    },
    updateLabelStatus (rtnArray) {
      rtnArray.sort((a, b) => b._key < a._key ? -1 : 1)
      this.labels = [...rtnArray, ...this.labels]
    },
    showTemplateDialog (item = {}) {
      this.createTemplateDialog = true
      this.templateInEdit = item
    },
    deleteTemplate (item) {
      if (!confirm('Are you sure to delete this template?')) return Promise.resolve()
      return this.$store.dispatch('deleteTemplate', item)
    },
    displayPackaging (packaging) {
      let {length, width, height, isMeasurementMetric, originLength, originWidth, originHeight} = packaging || {}
      return isMeasurementMetric ? `${originLength || length}cm/${originWidth || width}cm/${originHeight || height}cm` : `${originLength || length}"/${originWidth || width}"/${originHeight || height}"`
    },
    downloadSelectedLabelAndZip () {
      this.selectedLabels.sort((a, b) => {
        return a._key < b._key ? -1 : 1
      })
      return this.$store.dispatch('downloadSelectedLabels', {
        labels: this.selectedLabels.filter(item => item.url && item.status !== 'canceled'),
        isMergePDF: this.isMergePDF
      })
    },
    async cancelLabel (label) {
      if (!confirm(label.shipmentId ? `The shipment (ID: ${label.shipmentId}) will be canceled as well, do you want to proceed?` : 'Are you sure to cancel this label?')) return Promise.resolve()
      this.isLoading = true
      await this.$store.dispatch('cancelLabel', label)
      this.labels
        .forEach(item => {
          if (item.requestId === label.requestId) {
            this.$set(item, 'status', 'canceled')
          }
        })
      this.isLoading = false
    }
  }
}
</script>

<style scoped>
  .flash_alert{
    background-color: inherit !important;
    color: red;
    border: 0px;
  }

  .fontRed {
    color: red;
  }

  .fontGreen {
    color: green;
  }
</style>
