<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Submit"
    ref="formPopup"
    hasAlert
    large>
    <template v-slot:input>
      <v-container py-0 fluid>
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
                    <v-checkbox hide-details class="checkbox" label="Save" v-model="isSaveFrom"></v-checkbox>
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
                      :rules="[fieldIsRequired()]"
                      class="required_field"
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
                          v-model.trim="from.partyId"
                          :rules="[fieldIsRequired(), fieldCharLimit('EIN', 9)]"
                          class="required_field"></v-text-field>
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
                    <v-checkbox hide-details class="checkbox" label="Save" v-model="isSaveTo"></v-checkbox>
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
                      :rules="[fieldIsRequired()]"
                      class="required_field"
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
                          class="required_field"></v-text-field>
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
        <v-layout align-baseline>
          <v-flex>
            <v-card width="100%">
              <v-card-text>
                <v-layout align-baseline>
                  <v-flex class="title" md3>Shipment Info: </v-flex>
                </v-layout>
                <v-layout justify-space-between>
                  <v-flex xs2>
                    <vite-autocomplete
                      hide-details
                      :items="[{
                        name: 'Direct consumer',
                        value: 'directConsumer'
                      }, {
                        name: 'Government entity',
                        value: 'governmentEntity'
                      }, {
                        name: 'Reseller',
                        value: 'reseller'
                      }, {
                        name: 'Other',
                        value: 'other'
                      }]"
                      item-text="name"
                      item-value="value"
                      v-model="ultimateConsigneeType"
                      label="Ultimate Consignee Type"
                      readonly></vite-autocomplete>
                  </v-flex>
                  <v-flex xs2>
                    <v-text-field
                      hide-details
                      label="Carrier name"
                      v-model.trim="carrier.name"
                      readonly
                    ></v-text-field>
                  </v-flex>
                  <v-flex xs2>
                    <v-text-field
                      hide-details
                      label="Vessel name"
                      v-model.trim="carrier.vesselName"
                      readonly
                    ></v-text-field>
                  </v-flex>
                  <v-flex xs2>
                    <v-text-field
                      hide-details
                      label="Carrier code"
                      v-model.trim="carrier.code"
                      readonly
                    ></v-text-field>
                  </v-flex>
                  <v-flex xs2>
                    <v-menu
                      :close-on-content-click="false"
                      v-model="datePicker"
                      :nudge-right="40"
                      lazy
                      transition="scale-transition"
                      offset-y
                      full-width
                      min-width="290px"
                    >
                      <template v-slot:activator="data">
                        <v-text-field
                          v-model="onboardDate"
                          label="On board date"
                          prepend-icon="event"
                          readonly
                          v-on="data.on"
                          :rules="[
                            fieldIsRequired('On board date')
                          ]"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        :min="endDateMinimum.toISOString()"
                        v-model="onboardDate" 
                        @input="datePicker = false"></v-date-picker>
                    </v-menu>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
        <CommodityWidget
          isEeiMode
          v-model="commodities"/>

      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import EeiPackageWidget from './EeiPackageWidget'
import CommodityWidget from './CommodityWidget'
import { timeTools, checkRules, cloneDeep, toMoney, gotoGoogleMap, getRandomIdByTime } from '@/utils/tools'

export default {
  name: 'EeiEditPopup',
  components: {
    FormSubmitPopup,
    EeiPackageWidget,
    CommodityWidget
  },
  mixins: [
    checkRules,
    timeTools
  ],
  data () {
    return {
      title: JSON.stringify(this.eeiInEdit) === '{}' ? 'Add EEI' : 
        (this.isRecreate ? 'Copy EEI' : 'Edit EEI'),
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
      requestId: getRandomIdByTime(3),
      commodities: [],
      ultimateConsigneeType: 'reseller',
      carrier: {
        code: 'FDX',
        name: 'Fedex express',
        vesselName: 'FEDEX',
        loadingPortCode: '2006'
      },
      datePicker: false,
      onboardDate: new Date().toISOString().slice(0, 10),
      endDateMinimum: new Date()
    }
  },
  mounted () {
    if (JSON.stringify(this.eeiInEdit) !== '{}') {
      const {carrier, from, to, commodities, requestId, onboardDate} = this.eeiInEdit
      Object.assign(this, this.isRecreate ? {carrier, from, to, commodities, onboardDate} : 
        {carrier, from, to, commodities, requestId, onboardDate})
    }
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
    createAddress (addresses) {
      return this.$store.dispatch('labelCreateAddress', {addresses})
    },
    extractPayload () {
      const {
        from,
        to,
        commodities = [],
        carrier = {},
        onboardDate
      } = this

      let {name, ...fromRest} = from
      let {address1, address2, ...rest} = to

      return {
        from: {
          ...fromRest,
          partyIdType: 'E'
        },
        to: {
          ...rest,
          partyIdType: '',
          address1,
          address2: address2 || ''
        },
        note: this.labelNote || '',
        commodities,
        carrier,
        onboardDate
      }
    },
    onSubmitted () {
      const payload = this.extractPayload()
      if (!this.order) {
        delete payload.orderKey
      }
      let {isSaveFrom, isSaveTo, to, from, requestId} = this
      let {isAmazon: tempFlag, ...toRest} = to
      let {isAmazon, ...fromRest} = from
      let addressesToCreate = []
      isSaveTo && addressesToCreate.push(toRest)
      isSaveFrom && addressesToCreate.push(fromRest)
      addressesToCreate.length && this.createAddress(addressesToCreate)
      this.errorMessage = ''
      if (!payload.commodities.length) throw Error('Please add commodity before submit.')
      return this.$store.dispatch('processEei', {
        ...payload,
        requestId,
        type: JSON.stringify(this.eeiInEdit) === '{}' || this.isRecreate ? 'create' : 'update'
      })
        .then((res) => {
          this.$emit('submitted', {
            ...payload,
            requestId,
            res
          })
        })
        .catch(error => {
          if (error.errCode === 'endpoint-request-timed-out') {
            this.errorMessage = 'Endpoint request timed out. Please retry.'
          } else {
            this.errorMessage = error.data ? error.data.message : error.message
          }
          throw error
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
    }
  },
  props: {
    value: Boolean,
    eeiInEdit: Object,
    initTemplate: {
      type: Object,
      default: () => {
        return {}
      }
    },
    isRecreate: Boolean,
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
