<template>
  <div>
    <v-layout class="title" align-baseline justify-space-between>
      <v-flex xs3>
        Package & Shipment details:
      </v-flex>
      <v-flex md2>
        <v-autocomplete
          hide-details
          :items="templates"
          return-object
          label="Template"
          item-text="name"
          @change="onSelectTemplate"></v-autocomplete>
      </v-flex>
      <v-flex xs3>
        <v-menu
          :close-on-content-click="false"
          v-model="shipDateMenu"
          :nudge-right="40"
          lazy
          transition="scale-transition"
          offset-y
          full-width
          min-width="290px"
        >
          <template v-slot:activator="data">
            <v-text-field
              hide-details
              :value="shipDate"
              label="Ship date"
              readonly
              v-on="data.on"
            ></v-text-field>
          </template>
          <v-date-picker v-model="shipDate" @input="shipDateMenu = false"></v-date-picker>
        </v-menu>
      </v-flex>
      <v-flex xs3>
        <v-select
          hide-details
          :items="shippingServices"
          item-text="text"
          item-value="value"
          :menu-props="{returnValue:'value'}"
          v-model="shippingService"
          :rules="[fieldIsRequired('service')]"
          label="Shipping service"
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
    <v-layout justify-space-between>
      <v-flex xs3>
        <v-autocomplete
          hide-details
          :items="[{
            name: 'Documents',
            value: 'documents'
          }, {
            name: 'Products/Commodities',
            value: 'commodities'
          }]"
          v-model="packageContent"
          label="Package contents"
          item-text="name"
          item-value="value"
          readonly></v-autocomplete>
      </v-flex>
      <v-flex xs2>
        <v-autocomplete
          hide-details
          :items="[{
            name: 'Commercial',
            value: 'commercial'
          }]"
          label="Shipment purpose"
          v-model="shipmentPurpose"
          item-text="name"
          item-value="value"></v-autocomplete>
      </v-flex>
      <v-flex xs3>
        <v-select
          class="table-item"
          label="Signature"
          :items="signatureOptions"
          item-text="text"
          persistent-hint
          hint="Signature is required for FedEx international shipment"
          :menu-props="{returnValue:'value'}"
          v-model="signature"/>
      </v-flex>
      <v-flex xs3>
        <v-text-field
          class="table-item"
          hide-details
          label="Booking confirmation number"
          v-model="bookingConfirmationNumber"
          v-if="shippingService === 'INTERNATIONAL_ECONOMY_FREIGHT' || shippingService === 'INTERNATIONAL_PRIORITY_FREIGHT'"
          :rules="[
            fieldIsRequired('qty')
          ]"></v-text-field>
      </v-flex>
    </v-layout>
    <v-data-table
      :headers="headers"
      :items="packages"
      hide-actions
      class="elevation-2 mt-2"
      item-key="index"
    >
      <template v-slot:headerCell="props">
        <span v-if="props.header.value === 'action'">
          <v-tooltip top>
            <template v-slot:activator="tooltip">
              <div v-on="tooltip.on">
                <v-btn color="primary" flat small icon @click="addPackage" :disabled="!checkEnableMWT(shippingService)"><v-icon>add</v-icon></v-btn>
              </div>
            </template>
            Support up to 25 packages
          </v-tooltip>
        </span>
        <span v-else-if="props.header.value === 'weight'" @click="isOz = !isOz">{{ props.header.text }}</span>
        <span v-else>{{ props.header.text }}</span>
      </template>
      <template v-slot:items="props">
        <td class="text-xs-center">
          <v-btn v-if="props.index > 0" color="primary" flat small icon @click="deletePackage(props.item)"><v-icon>delete</v-icon> </v-btn>
        </td>
        <td class="text-xs-left">
          <v-text-field
            class="table-item"
            hide-details
            v-model.number="props.item.qty"
            :disabled="!checkEnableMWT(shippingService)"
            :rules="[
              fieldIsRequired('qty'), 
              fieldIsOverZero('qty'),
              fieldIsInteger('qty')
            ]"></v-text-field>
        </td>
        <td class="text-xs-left">
          <v-text-field
            class="table-item"
            hide-details
            v-model.number="props.item.weightLb"
            :rules="[
              fieldIsRequired('weight'), 
              fieldIsNoLessThanZero('weight'),
              isMeasurementMetric ? (() => true) : fieldIsPkgWeight(isOz)
            ]"
            :suffix="isMeasurementMetric ? 'kg' : (isOz ? 'Oz' : 'Lbs')"></v-text-field>
        </td>
        <td class="text-xs-left">
          <v-layout align-center>
            <v-flex xs4 class="mr-3">
              <v-text-field
                class="table-item"
                hide-details
                v-model.number="props.item.length"
                :suffix="sizeSuffix"
                :rules="[
                  fieldIsRequired('length'), 
                  fieldIsOverZero('length')
                ]"></v-text-field>
            </v-flex>
            <v-flex xs4 class="mr-3">
              <v-text-field
                class="table-item"
                hide-details
                v-model.number="props.item.width"
                :suffix="sizeSuffix"
                :rules="[
                  fieldIsRequired('width'), 
                  fieldIsOverZero('width')
                ]"></v-text-field>
            </v-flex>
            <v-flex xs4>
              <v-text-field
                class="table-item"
                hide-details
                v-model.number="props.item.height"
                :suffix="sizeSuffix"
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
                max-height="300px"
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
        </td>
        <td class="text-xs-left">
          <v-text-field
            class="table-item"
            hide-details
            :disabled="!isInsuranceEnabled"
            v-model.number="props.item.declaredValue"
            :rules="[fieldIsRequired('value'), fieldIsNoLessThanZero('value')]"></v-text-field>
        </td>
      </template>
    </v-data-table>
  </div>

</template>

<script>
import { cloneDeep, checkRules, timeTools, measurementTools, isObject } from '@/utils/tools'

const initPackage = {
  height: 0,
  width: 0,
  weightLb: 0,
  length: 0,
  isOz: false,
  declaredValue: 0,
  packaging: 'Default packaging',
  qty: 1,
  memo: ''
}

export default {
  name: 'EeiPackageWidget',
  data () {
    return {
      menu: [],
      memo: '',
      note: '',
      shipDate: this.toPickerDateString(new Date()),
      shipDateMenu: false,
      isOz: false,
      shippingService: '',
      signature: 'INDIRECT',
      packageContent: 'commodities',
      shipmentPurpose: 'commercial',
      bookingConfirmationNumber: '00000'
    }
  },
  mixins: [checkRules, timeTools, measurementTools],
  mounted () {
    const defaultShippingService = (this.shippingServices.find((serviceType) => serviceType.default) || {}).value || 'FEDEX_GROUND'
    this.setShippingService(defaultShippingService)
    this.$emit('update:packages', [cloneDeep(initPackage)])
  },
  computed: {
    headers () {
      return [
        { text: 'Action', value: 'action', align: 'center', sortable: false },
        { text: 'Identical package qty', value: '', align: 'left', sortable: false },
        this.isMeasurementMetric ? 
          { text: `Weight(kg)`, value: 'weight', align: 'left', sortable: false } : 
          { text: `Weight(${this.isOz ? 'Click here switch to Lbs' : 'Click here switch to Oz'})`, value: 'weight', align: 'left', sortable: false },
        { text: 'Length / Width / Height', value: 'packaging', align: 'left', sortable: false, width: '25%' },
        { text: 'Declared value', value: 'createTime', align: 'left', sortable: false }
      ]
    },
    isInsuranceEnabled () {
      return (this.labelServices.find(service => service.carrier === this.carrier) || {}).enableInsured
    },
    signatureOptions () {
      const optMap = new Map(this.labelServices.reduce((acc, service) => {
        let services = service.serviceTypes.map(item => {
          return [item.value, service.signatureOptions]
        })
        return [...acc, ...services]
      }, []))
      return optMap.get(this.shippingService) || []
    },
    packagings () {
      return this.$store.getters.tenantPackagingsWithDefault
    },
    templates () {
      return this.$store.getters.templates
    },
    labelServices () {
      return this.$store.getters.internationalLabelServices
    },
    shippingServices () {
      return this.labelServices
        .reduce((services, {carrier = '', enableInsured = false, serviceTypes = []}, idx) => [
          ...services, 
          ...serviceTypes,
          { divider: true }
        ], [])
    },
    carrier () {
      return (this.labelServices.find(service => 
        service.serviceTypes.find(serviceType => 
          this.shippingService === serviceType.value || 
          this.serviceType === service.carrier
        )
      ) || {}).carrier
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
  watch: {
    signatureOptions (value) {
      let defaultValue = value[0].value || ''
      for (let option of value) {
        if (option.default) defaultValue = option.value
        if (option.value === this.signature) return
      }
      this.signature = defaultValue
    },
    shippingService (value, oldValue) {
      if (value === oldValue) return
      if (!this.checkEnableMWT(value) && this.packages.reduce((acc, pkg) => acc + pkg.qty, 0) > 1) {
        if (confirm('This service does not support multiple packages in one shipping, are you sure to change the packages?')) {
          this.$emit('update:packages', [this.packages[0]])
          this.$emit('update:shippingService', value)
        } else {
          this.$nextTick(() => {
            this.setShippingService(oldValue)
          })
        }
      } else {
        this.$emit('update:shippingService', value)
      }
    }
  },
  methods: {
    isObject,
    addPackage () {
      this.$emit('update:packages', [...this.packages, cloneDeep(initPackage)])
    },
    onSelectPackaging (e, item) {
      const {height, length, width, isMeasurementMetric = false} = e
      Object.assign(item, this.convertPackagingSize({height, length, width}, isMeasurementMetric))
      this.menu = []
    },
    onSelectTemplate (e) {
      const {
        packaging,
        shippingService,
        signature,
        declaredValue,
        weightLb,
        isMeasurementMetric: isWeightMeasurementMetric = false,
        memo = ''
      } = e
      let replacedMemo = this.flexibleVars.reduce((acc, variable) => {
        return acc.replace(new RegExp(`#{${variable}}`, 'g'), this[variable] || '')
      }, memo)
      Object.assign(this, {
        shippingService, 
        memo: replacedMemo,
        signature
      })
      this.setShippingService(shippingService)
      const targetPackaging = this.packagings.find(item => item.pkgValue === packaging) || {}
      const {height, length, width, isMeasurementMetric: isPackagingMeasurementMetric = false, ...rest} = targetPackaging

      Object.assign(this.packages[0], {
        ...this.convertPackagingSize({height, length, width}, isPackagingMeasurementMetric),
        ...rest,
        weightLb: this.convertWeight(weightLb, isWeightMeasurementMetric),
        declaredValue
      })
    },
    $$extractData () {
      const packages = this.packages
        .map(pkg => {
          const {
            packaging,
            qty,
            pkgValue,
            name,
            isPackagingDefault,
            weightLb,
            ...rest
          } = pkg
          return new Array(qty).fill(1).map(item => {
            return {...rest, weight: this.isOz ? (weightLb / 16) : weightLb, pkgValue, isMeasurementMetric: this.isMeasurementMetric}
          })
        })
        .flat()
        .map((item, index) => {
          return {...item, sequenceNumber: index + 1}
        })

      const {
        shipDate, 
        shippingService,
        signature,
        memo,
        note,
        bookingConfirmationNumber
      } = this

      return {
        packages,
        shipDate, 
        shippingService,
        signature,
        memo,
        note,
        bookingConfirmationNumber
      }
    },
    setShippingService (value) {
      this.shippingService = value
      this.$emit('update:shippingService', value)
    },
    deletePackage (item) {
      this.$emit('update:packages', this.packages.filter(pkg => pkg !== item))
    },
    checkEnableMWT (shippingService) {
      for (let labelService of this.labelServices) {
        const {enableMWT = false, serviceTypes = []} = labelService
        if (serviceTypes.some(({value}) => shippingService === value)) return enableMWT
      }
      return false
    }
  },
  props: {
    packages: Array
  }
}
</script>

<style>
.table-item {
  padding-bottom: 12px;
}
</style>
