<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Submit"
    ref="formPopup"
    hasAlert
    large
  >
    <template v-slot:input>
      <v-container py-0 fluid>
        <v-layout class="title" align-baseline justify-space-between>
          <v-flex>
            <v-card width="100%">
              <v-card-text>
                <v-layout align-baseline>
                  <v-flex xs3>
                    Electronic Export Information:
                  </v-flex>
                  <v-flex xs3>
                    <v-menu 
                      offset-y
                      :close-on-content-click="false"
                      v-model="menuItn"
                    >
                      <template v-slot:activator="{ on }">
                        <v-text-field
                          label="ITN"
                          persistent-hint
                          hint="ITN is required when shipment customs value is over $2500."
                          v-model="itn"
                          @click.stop="on.click"
                        >
                          <template v-slot:append>
                            <v-btn color="primary" small flat @click.stop="getAddressFromItn" :disabled="!itn">Import info</v-btn>
                          </template>
                        </v-text-field>
                      </template>
                      <v-list v-if="recentItns && recentItns.length">
                        <v-list-tile 
                          v-for="item in recentItns" 
                          :key="item.requestId" 
                          @click.stop="() => onSelectItn(item)"
                        >
                          <v-list-tile-content>
                            <v-list-tile-title>{{ item.requestId }} - {{ item.itn || 'pending' }}</v-list-tile-title>
                          </v-list-tile-content>
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                  </v-flex>
                  <v-flex xs1>
                    <v-tooltip top>
                      <template v-slot:activator="{on}">
                        <div v-on="on">
                          <LoaderButton
                            buttonIcon
                            flat
                            :promiseAwait="getEeiStatus"
                          >
                            <template v-slot:icon>
                              <v-icon>refresh</v-icon>
                            </template>
                          </LoaderButton>
                        </div>
                      </template>
                      Get selected ITN
                    </v-tooltip>
                  </v-flex>
                  <v-flex xs2>
                    <v-checkbox
                      v-model="isCommercialInvoice"
                      label="Commercial invoice"></v-checkbox>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <v-layout row>
          <v-flex md6>
            <v-card width="100%">
              <v-card-text>
                <v-layout align-baseline>
                  <v-flex class="title" md3>Sender: </v-flex>
                  <v-flex md4>
                    <vite-autocomplete
                      hide-details
                      :items="addresses"
                      name="address-template-name"
                      return-object
                      label="Address name"
                      v-model="fromTemplate"
                      item-text="siteName"
                      item-value="siteName"></vite-autocomplete>
                  </v-flex>
                  <v-flex md2>
                    <v-checkbox hide-details label="Save" class="checkbox" v-model="isSaveFrom"></v-checkbox>
                  </v-flex>
                  <v-flex md4>
                    <v-text-field
                      hide-details
                      label="Address name"
                      v-model.trim="from.siteName"
                      v-if="isSaveFrom"
                      :rules="[ fieldIsRequired('Site name'),  v => v === to.siteName && isSaveTo ? 'Site name is same as To site' : true]"
                      class="required_field"></v-text-field> 
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Full name"
                          v-model.trim="from.fullName"
                          :rules="[ fieldIsRequired('Full name'), fieldCharLimit('Full name', 35) ]"
                          class="required_field"
                        ></v-text-field> 
                      </v-flex>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Phone"
                          v-model.trim="from.phone"
                        ></v-text-field>
                      </v-flex>
                    </v-layout>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      hide-details
                      label="Company name"
                      v-model.trim="from.company"
                    ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-text-field
                      hide-details
                      label="Address 1"
                      v-model.trim="from.address1"
                      :rules="[fieldIsRequired('Address'), fieldCharLimit('Address1', 50)]"
                      class="required_field"></v-text-field>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      hide-details
                      label="Address 2"
                      :rules="[fieldCharLimit('Address2', 50)]"
                      v-model.trim="from.address2"
                      ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="City"
                          v-model.trim="from.city"
                          :rules="[fieldIsRequired('City')]"
                          class="required_field"
                          ></v-text-field>
                      </v-flex>
                      <v-flex xs5>
                        <vite-autocomplete
                          hide-details
                          :items="states"
                          v-model="from.state"
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
                    </v-layout>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      hide-details
                      label="Zip code"
                      v-model.trim="from.zipCode"
                      :rules="[fieldIsRequired('Zip code')]"
                      class="required_field"></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="EIN"
                          v-model.trim="from.partyId"></v-text-field>
                      </v-flex>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Email"
                          v-model.trim="from.email"></v-text-field>
                      </v-flex>
                    </v-layout>
                  </v-flex>

                  <v-flex xs4>
                    <vite-autocomplete
                      hide-details
                      :items="[{
                        name: 'United States',
                        value: 'US'
                      }]"
                      item-text="name"
                      item-value="value"
                      v-model="from.countryCode"
                      label="Country"></vite-autocomplete>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex md6>
            <v-card width="100%">
              <v-card-text>
                <v-layout align-baseline>
                  <v-flex class="title" md3>Recipient: </v-flex>
                  <v-flex md4>
                    <vite-autocomplete
                      hide-details 
                      :items="addresses"
                      return-object
                      label="Address name"
                      v-model="toTemplate"
                      item-text="siteName"
                      item-value="siteName"></vite-autocomplete>
                  </v-flex>
                  <v-flex md2>
                    <v-checkbox hide-details label="Save" v-model="isSaveTo" class="checkbox"></v-checkbox>
                  </v-flex>
                  <v-flex md4>
                    <v-text-field
                      hide-details
                      label="Address name"
                      v-model.trim="to.siteName"
                      v-if="isSaveTo"
                      :rules="[ fieldIsRequired('Site name'),  v => v === from.siteName && isSaveFrom? 'Site name is same as From site' : true]"
                      class="required_field"></v-text-field> 
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Full name"
                          v-model.trim="to.fullName"
                          :rules="[ fieldIsRequired('Full name'), fieldCharLimit('Full name', 35) ]"
                          class="required_field"
                        />
                      </v-flex>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Phone"
                          v-model.trim="to.phone"
                        />
                      </v-flex>
                    </v-layout>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      hide-details
                      label="Company name"
                      v-model.trim="to.company"
                    />
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-text-field
                      hide-details
                      label="Address 1"
                      v-model.trim="to.address1"
                      :rules="[fieldIsRequired('Address'), fieldCharLimit('address', 50)]"
                      class="required_field"></v-text-field>
                  </v-flex>
                  <v-flex xs4>
                    <v-text-field
                      hide-details
                      label="Address 2"
                      :rules="[fieldCharLimit('Address2', 50)]"
                      v-model.trim="to.address2"
                      ></v-text-field>
                  </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="City"
                          v-model.trim="to.city"
                          :rules="[fieldIsRequired('City')]"
                          class="required_field"
                          ></v-text-field>
                      </v-flex>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="State"
                          v-model.trim="to.state"></v-text-field>
                      </v-flex>
                    </v-layout>
                  </v-flex>
                  <v-flex xs4>
                    <v-layout justify-space-around align-baseline>
                      <v-flex>
                        <v-text-field
                          hide-details
                          label="Zip code"
                          v-model.trim="to.zipCode"></v-text-field>    
                      </v-flex>
                      <v-flex xs2>
                        <v-tooltip top>
                          <template v-slot:activator="{on}">
                            <v-btn :disabled="googleMapDisabled" icon flat v-on="on" color="primary" @click.stop="goToGoogleMapLink" small><v-icon>location_on</v-icon></v-btn>
                          </template>
                          <span> Google Map</span>
                        </v-tooltip>
                      </v-flex>
                    </v-layout>
                    </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs7>
                    <v-layout justify-space-between>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="EIN"
                          v-model.trim="to.partyId"></v-text-field>
                      </v-flex>
                      <v-flex xs5>
                        <v-text-field
                          hide-details
                          label="Email"
                          v-model.trim="to.email"></v-text-field>
                      </v-flex>
                    </v-layout>
                  </v-flex>
                  <v-flex xs4>
                    <vite-autocomplete
                      hide-details
                      :items="countryCodeArray"
                      item-text="name"
                      item-value="value"
                      v-model="to.countryCode"
                      label="Country"
                      :rules="[fieldIsRequired('Country')]"
                      class="required_field"></vite-autocomplete>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <v-layout row>
          <v-flex>
            <v-card width="100%">
              <v-card-text>
                <EeiPackageWidget
                  ref="EeiPackageWidget"
                  :packages.sync="packages"
                  :shippingService.sync="shippingService"/>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <v-layout row>
          <v-flex>
            <v-card width="100%">
              <v-card-text>
                <v-layout class="title" align-baseline justify-space-between>
                  <v-flex xs2>
                    Billing details:
                  </v-flex>
                  <v-flex md2>
                    <vite-autocomplete
                      hide-details
                      :items="[{
                        text: 'Sender',
                        value: 'sender'
                      }]"
                      readonly
                      item-value="value"
                      item-text="text"
                      v-model="billingTransportationTo"
                      label="Billing transportation to"></vite-autocomplete>
                  </v-flex>
                  <v-flex xs2>
                    <vite-autocomplete
                      hide-details
                      :items="[{
                        text: 'Recipient',
                        value: 'recipient'
                      }]"
                      readonly
                      item-value="value"
                      item-text="text"
                      v-model="billingDutiesTaxesFeesTo"
                      label="Bill duties/taxes/fees to"></vite-autocomplete>
                  </v-flex>
                  <v-flex xs2>
                  </v-flex>
                  <v-flex xs2>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <CommodityWidget
          v-model="commodities"/>

        <v-layout column>
          <v-flex>
            <v-layout justify-end align-baseline>
              <v-flex xs8>
                <v-layout align-baseline>
                  <v-flex md2><v-btn color="primary" @click.stop="getRate">Get rate</v-btn></v-flex>
                  <v-flex md9>
                    <v-layout>
                      <v-flex md2 v-if="isLoadingRates">
                        <v-progress-circular
                          indeterminate
                          color="primary"></v-progress-circular>
                      </v-flex>
                      <v-flex md10 v-else>
                        <v-layout row no-wrap text-xs-center>
                          Discount charge: $ {{ displayRate.rate || '----' }}
                          &nbsp;&nbsp;
                          Surcharge: $ {{ displayRate.surcharge === null ? '----' : displayRate.surcharge }}
                          <small v-if="displayRate.hasResidentialCheck" style="color: blue;">{{
                            displayRate.isResidential ? "Residential" : 'Commercial'
                          }}</small>
                          &nbsp;&nbsp;
                          Total: $ {{ displayRate.rate ? toMoney(displayRate.rate + displayRate.surcharge) : '----' }}
                          &nbsp;&nbsp;&nbsp;
                          <span v-if="displayRate.estimatedDelivery && displayRate.estimatedDelivery !== 'N/A' && !['xs', 'sm', 'md'].includes($vuetify.breakpoint.name)">
                            Est delivery: {{ formatEstDeliveryDate(displayRate.estimatedDelivery) }}
                          </span>
                        </v-layout>
                      </v-flex>
                    </v-layout>
                  </v-flex>
                  <v-flex md2 v-if="rates.length > 1 && !isLoadingRates" class="subheading font-weight-bold">
                    <!-- more Rates -->
                    <v-menu
                      v-model="moreRatesToggle"
                      :close-on-content-click="false"
                      :nudge-width="200"
                      offset-x
                    >

                      <template v-slot:activator="{ on }">
                        <v-btn
                          dark
                          color="primary"
                          flat
                          v-on="on"
                        > More rates
                        </v-btn>
                      </template>

                      <v-card>
                        <v-card-text>
                          <v-data-table
                            :headers="[
                              { text: 'Service', align: 'left', sortable: false, value: 'serviceType' },
                              { text: 'Discount charge ($)', align: 'left', sortable: false, value: 'rate' },
                              { text: 'Surcharge ($)', align: 'left', sortable: false, value: 'surcharge'},
                              { text: 'Total ($)', align: 'left', sortable: false, value: 'total'},
                              { text: 'Est delivery', align: 'left', sortable: false, value: ''}
                            ]"
                            :items="rates"
                            item-key="serviceType"
                            hide-actions
                          >
                            <template v-slot:items="{ item }">
                              <td ><a linkify @click="() => {
                                $refs['EeiPackageWidget'].shippingService = item.serviceType === 'GROUND_HOME_DELIVERY' ? 'FEDEX_GROUND' : item.serviceType
                              }">{{ item.serviceDescription }}</a></td>
                              <td>{{ item.rate }}</td>
                              <td>{{ item.surcharge }}</td>
                              <td>{{ item.total }}</td>
                              <td>
                                {{ formatEstDeliveryDate(item.estimatedDelivery) }}
                              </td>
                            </template>
                          </v-data-table>
                        </v-card-text>
                        <v-card-actions>
                          <v-spacer></v-spacer>
                          <v-btn color="primary" flat @click="moreRatesToggle = false" >Close</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </v-flex>
                </v-layout>
              </v-flex>
            </v-layout>
            <v-layout v-if="errorMessage">
              <v-flex class="red--text font-weight-bold text-xs-right">
                {{errorMessage}}
              </v-flex>
            </v-layout>
            <v-layout v-if="Object.keys(warningMessages).length" justify-end>
              <span class="font-weight-bold text-xs-right" style="background-color: yellow;">
                {{Object.values(warningMessages).join(', ')}}
              </span>
            </v-layout>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import EeiPackageWidget from './EeiPackageWidget'
import { timeTools, checkRules, cloneDeep, toMoney, gotoGoogleMap } from '@/utils/tools'
import CommodityWidget from './CommodityWidget'
import LoaderButton from './LoaderButton'

export default {
  name: 'LabelCreatePopup',
  components: {
    FormSubmitPopup,
    EeiPackageWidget,
    CommodityWidget,
    LoaderButton
  },
  mixins: [
    checkRules,
    timeTools
  ],
  data () {
    return {
      title: 'Create international label',
      packaging: '',
      signature: false,
      menu: false,
      newSenderName: '',
      from: {
        countryCode: 'US'
      },
      fromTemplate: {},
      to: {},
      toTemplate: {},
      rate: null,
      surcharge: null,
      insuredValue: 0,
      isLoadingRates: false,
      isSaveFrom: false,
      isSaveTo: false,
      quantity: 1,
      memo: '',
      note: '',
      errorMessage: '',
      warningMessages: {},
      name: '',
      rates: [],
      moreRatesToggle: false,
      shippingService: '',
      packages: [],
      requestIdCache: '',
      isUseCompanySignatureOnFile: false,
      isOriginatorShipperDiff: false,
      isRecipientNotImporter: false,
      termsOfSale: '',
      isUseCompanyLetterheadOnFile: false,
      isProFormaInvoice: false,
      isCommercialInvoice: true,
      itn: '',
      billingDutiesTaxesFeesTo: 'recipient',
      billingTransportationTo: 'sender',
      commodities: [],
      recentItns: [],
      menuItn: false
    }
  },
  async created () {
    this.recentItns = await this.$store.dispatch('getRecentItns')
  },
  computed: {
    states () {
      return this.$store.getters.stateAbbrevs
    },
    addresses () {
      return this.$store.getters.tenantAddresses
    },
    packagingMap () {
      return this.$store.getters.packagingMap
    },
    labelServices () {
      return this.$store.getters.labelServices
    },
    systemBalance () {
      return this.$store.getters.systemBalance
    },
    displayRate () {
      return this.rates.find(({serviceType, carrier}) => 
        carrier.toLowerCase() === this.shippingService.toLowerCase() || 
        serviceType.toLowerCase() === this.shippingService.toLowerCase() || 
        (this.shippingService === 'FEDEX_GROUND' && serviceType === 'GROUND_HOME_DELIVERY')
      ) || {}
    },
    limitMultipleShipping () {
      if (this.packages.reduce((acc, pkg) => acc + pkg.qty, 0) === 1) return (v) => v <= 5 || 'Label quantity is limited to 5.'
      if (this.shippingService !== 'USPS') {
        return (v) => v <= 1 || 'Multiple shipping are only supported for Usps.'
      }
      return (v) => v <= 5 || 'Label quantity is limited to 5.'
    },
    isMeasurementMetric () {
      return !!this.$store.getters.isMeasurementMetric
    },
    googleMapDisabled () {
      return !(
        this.to && (
          this.to.address1 &&
          this.to.city &&
          this.to.state &&
          this.to.zipCode
        )
      )
    },
    countryCodeArray () {
      return this.$store.getters.countryCodeArray
    }
  },
  mounted () {
    this.from = this.initFrom ? cloneDeep(this.initFrom) : this.from
    this.to = this.initTo ? cloneDeep(this.initTo) : this.to
  },
  watch: {
    toTemplate (value) {
      this.to = cloneDeep(this.toTemplate)
    },
    fromTemplate (value) {
      this.from = cloneDeep(this.fromTemplate)
    },
    shippingService (value) {
      if (['USPS', 'UPS_GROUND'].includes(value)) {
        this.quantity = 1
        this.packages && this.packages.forEach(pkg => {
          pkg.insuredValue = 0
          pkg.qty = 1
        })
      }
    }
  },
  methods: {
    toMoney,
    async getAddressFromItn () {
      const {from = {}, to = {}, commodities = [], onboardDate} = await this.$store.dispatch('getAddressFromItn', {itn: this.itn})
      if (onboardDate) {
        Object.assign(this, {from, to, commodities})
        this.$refs['EeiPackageWidget'].shipDate = onboardDate
      }
    },
    createAddress (addresses) {
      return this.$store.dispatch('labelCreateAddress', {addresses})
    },
    extractPayload () {
      const {
        from,
        to,
        order,
        isUseCompanySignatureOnFile,
        isOriginatorShipperDiff,
        isRecipientNotImporter,
        termsOfSale,
        isUseCompanyLetterheadOnFile,
        isProFormaInvoice,
        isCommercialInvoice,
        itn,
        commodities
      } = this

      const {
        packages,
        shipDate, 
        shippingService,
        signature,
        memo,
        note
      } = this.$refs['EeiPackageWidget'].$$extractData()

      let {name, ...fromRest} = from
      let {address1, address2, ...rest} = to

      return {
        packages,
        from: fromRest,
        to: {
          ...rest,
          address1,
          address2: address2 || ''
        },
        shipDate,
        serviceType: shippingService,
        shippingService,
        signature,
        memo,
        note: note || this.labelNote,
        orderKey: order ? order._key : '',
        carrier: 'fedex-international',
        isMeasurementMetric: this.isMeasurementMetric,
        isUseCompanySignatureOnFile,
        isOriginatorShipperDiff,
        isRecipientNotImporter,
        termsOfSale,
        isUseCompanyLetterheadOnFile,
        isProFormaInvoice,
        isCommercialInvoice,
        itn,
        commodities: commodities.map(item => {
          const {commodityWeight, ...rest} = item
          return {weight: commodityWeight, ...rest}
        })
      }
    },
    getRate () {
      if (this.packages.reduce((acc, pkg) => acc + pkg.qty, 0) > 25) {
        throw Error('Package quantity are limited to 25.')
      }
      try {
        this.moreRates = []
        if (!this.$refs['formPopup'].validate()) return
        this.errorMessage = ''
        this.deleteWarningMessage('address-ambiguous', 'recommend-address')
        let payload = this.extractPayload()
        this.systemBalance.discount && (payload.discount = this.systemBalance.discount)
        this.isLoadingRates = true
        this.$store.dispatch('getRates', payload)
          .then(rtn => {
            if (rtn.data.notMatch) {
              this.setWarningMessages('address-ambiguous', `The customer's address is ambiguous, missing required information, or doesn't exist.`)
            } else if (rtn.data.isCleansed) {
              let {
                address1,
                city,
                state,
                zipCode
              } = rtn.data
              this.setWarningMessages('recommend-address', `Recommended recipient address: ${address1}, ${city}, ${state} ${zipCode}`)
            } 
            if (rtn.data.moreRates) {
              const {estimatedDelivery: estDelivery = null} = rtn.data
              this.rates = rtn.data.moreRates.map(({serviceType, serviceDescription, amountDetails, estimatedDelivery = estDelivery}) => {
                const {postageAmount, ...surcharges} = amountDetails
                const surcharge = Object.values(surcharges).reduce((a, b) => toMoney(a + b), 0)
                return {
                  carrier: rtn.data.carrier,
                  serviceType,
                  serviceDescription,
                  rate: postageAmount,
                  hasResidentialCheck: true,
                  isResidential: rtn.data.isResidential,
                  surcharge,
                  total: toMoney(surcharge + postageAmount),
                  estimatedDelivery
                }
              })
            } else if (rtn.data.totalAmount) { // non-fedex
              const {postageAmount, ...surcharges} = rtn.data.amountDetails
              const surcharge = Object.values(surcharges).reduce((a, b) => toMoney(a + b), 0)
              const {carrier = 'usps', serviceType, serviceDescription, estimatedDelivery} = rtn.data
              this.rates = [{
                carrier,
                serviceType,
                serviceDescription,
                estimatedDelivery,
                hasResidentialCheck: false,
                rate: postageAmount,
                surcharge,
                total: toMoney(surcharge + postageAmount)
              }]
            }
          })
          .catch(error => {
            this.errorMessage = error.message
          })
          .finally(() => {
            this.isLoadingRates = false
          })
      } catch (e) {
        this.errorMessage = e.message
      }
    },
    onSubmitted () {
      const pkgQty = this.packages.reduce((acc, pkg) => acc + pkg.qty, 0) > 25
      if (pkgQty > 25) {
        throw Error('Package quantity are limited to 25.')
      }
      if (['USPS', 'UPS_GROUND'].includes(this.shippingService) && pkgQty > 1) {
        throw Error('Selected provider does not support multiple packages.')
      }
      if (this.commodities.reduce((item, acc) => acc + item.customsValue, 0) > 2500 && !this.itn) {
        throw Error('ITN is required when shipment customs value is over $2500.')
      }

      const payload = this.extractPayload()
      if (!this.order) {
        delete payload.orderKey
      }
      let {isSaveFrom, isSaveTo, to, from} = this
      let {isAmazon: tempFlag, ...toRest} = to
      let {isAmazon, ...fromRest} = from
      let addressesToCreate = []
      isSaveTo && addressesToCreate.push(toRest)
      isSaveFrom && addressesToCreate.push(fromRest)
      addressesToCreate.length && this.createAddress(addressesToCreate)
      this.errorMessage = ''
      const label = {
        ...payload,
        isMeasurementMetric: this.isMeasurementMetric,
        requestId: this.requestIdCache || this.idGenerator(1)[0]
      }
      return this.$store.dispatch('createInternationalLabel', label)
        .then(rtn => {
          this.requestIdCache = ''
          const {successLabels, errorLabels} = rtn
          this.$emit('submitted', successLabels
            .map(item => {
              return {
                ...item,
                createTime: new Date(),
                lastModifiedTime: new Date()
              }
            }))

          if (errorLabels.length > 0) {
            throw Error(`${successLabels.length} label(s) created successfully. ${errorLabels.length} failed. You can try recreating the rest of labels.`)
          }
        })
        .catch(error => {
          if (error.message === 'request-label-error') {
            this.errorMessage = 'Failed to request for label, please check label info.'
          } else if (error.message === 'endpoint-request-timed-out') {
            this.errorMessage = 'Endpoint request timed out. Please retry.'
            this.requestIdCache = label.requestId
          } else if (error.message === 'Package 1 - Special service SIGNATURE_OPTION is invalid.') {
            this.errorMessage = 'Signature is required for unit customs value over $100.'
          } else {
            this.errorMessage = error.data ? error.data.message : error.message
          }
          throw new Error(this.errorMessage)
        })
    },
    deleteAddress (address) {
      if (!confirm('Are you sure to delete this address?')) return Promise.resolve()
      return this.$store.dispatch('labelDeleteAddress', address)
        .then(() => {
          if (this.from.siteName === address.siteName) {
            this.from = {}
          }
          if (this.to.siteName === address.siteName) {
            this.to = {}
          }
        })
    },
    setWarningMessages (key, value) {
      this.warningMessages[key] = value
    },
    deleteWarningMessage (...keys) {
      keys.forEach(key => {
        delete this.warningMessages[key]
      })
    },
    clearWarningMessages () {
      this.warningMessages = {}
    },
    formatEstDeliveryDate (str) {
      return (str === 'N/A' || !str) ? 'N/A' : this.toDateYYYYMMDD((new Date(str)))
    },
    goToGoogleMapLink () {
      gotoGoogleMap(this.to)
    },
    onSelectItn (item) {
      this.itn = item.itn
      this.menuItn = false
    },
    async getEeiStatus () {
      await Promise.all(this.recentItns.map(async item => {
        if (item.itn) return 'success'
        const {itn} = await this.$store.dispatch('getEeiStatus', item)
        item.itn = itn
      }))
      return 'success'
    }
  },
  props: {
    value: Boolean,
    idGenerator: Function,
    initFrom: Object,
    initTo: Object,
    initTemplate: {
      type: Object,
      default: () => {
        return {}
      }
    },
    onlyOneLabel: Boolean,
    labelNote: {
      type: String,
      default: () => {
        return ''
      }
    },
    order: Object
  }
}
</script>

<style>

.checkbox {
  margin-bottom: 0px; 
  position: relative; 
  top: 12px;
}

</style>
