<template>
  <div>
    <v-layout row>
      <v-flex>
        <v-card width="100%">
          <v-card-text>
            <v-layout class="title" align-baseline>
              <v-flex xs4>
                <v-layout class="title" align-baseline>
                  <v-flex xs5>
                    Commodity info:
                  </v-flex>
                  <v-flex xs5>
                    <v-menu 
                      offset-y
                      :close-on-content-click="false"
                      v-model="menuProfile"
                    >
                      <template v-slot:activator="{ on }">
                        <v-text-field
                          ref="profile"
                          label="Profile"
                          persistent-hint
                          v-model="searchText"
                          @click.stop="on.click"
                          @keyup.enter="getCommodities"
                        >
                          <template v-slot:append>
                            <LoaderButton
                              flat
                              isSmall
                              :promiseAwait="getCommodities"
                              buttonText="Search"
                            ></LoaderButton>
                          </template>
                        </v-text-field>
                      </template>
                      <v-list v-if="searchedCommodities && searchedCommodities.length">
                        <v-list-tile 
                          v-for="item in searchedCommodities" 
                          :key="item.requestId" 
                          @click.stop="() => onSelectCommodity(item)"
                        >
                          <v-list-tile-content>
                            <v-list-tile-title>{{ item.profileName }}</v-list-tile-title>
                          </v-list-tile-content>
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                  </v-flex>
                </v-layout>
              </v-flex>
              <v-flex class="red--text font-weight-bold text-xs-right" v-if="errorMessage">
                {{errorMessage}}
              </v-flex>
            </v-layout>
            <v-data-table
              :headers="commodityHeaders"
              :items="value"
              hide-actions
              class="elevation-2 mt-2"
            >
              <template v-slot:items="props">
                <td class="subheading">{{props.item.profileName}}</td>
                <td class="text-xs-left">{{props.item.scheduleBCode}}</td>
                <td class="text-xs-left">{{props.item.exportInformationCode}}</td>
                <td class="text-xs-left">{{props.item.countryOfOrigin}}</td>
                <td class="text-xs-left">{{props.item.licenseExceptionSymbol}}</td>
                <td class="text-xs-left">{{props.item.customsValue}}</td>
                <td class="text-xs-left">{{props.item.quantity}}</td>
                <td class="text-xs-left">{{props.item.quantity2}}</td>
                <td class="text-xs-left">{{props.item.commodityWeight}}</td>
                <td class="text-xs-center">
                  <v-btn icon @click="deleteCommodity(props.item)"><v-icon>delete</v-icon></v-btn>
                </td>
              </template>
            </v-data-table>
            <v-form ref="form" lazy-validation>
              <v-layout align-baseline justify-space-between>
                <v-flex xs2>
                  <v-text-field
                    hide-details
                    label="Schedule B description"
                    :rules="[
                      fieldIsRequired()
                    ]"
                    class="required_field"
                    v-model="commodityInEdit.scheduleBDescription"></v-text-field>    
                </v-flex>
                <v-flex xs2>
                  <v-text-field
                    hide-details
                    label="Schedule B code"
                    :rules="[fieldIsRequired()]"
                    class="required_field"
                    :disabled="!isScheduleBReady"
                    v-model="commodityInEdit.scheduleBCode"></v-text-field>    
                </v-flex>
                <v-flex xs2>
                  <v-autocomplete
                    hide-details
                    v-model="commodityInEdit.exportInformationCode"
                    :items="[{text: 'OS - ALL OTHER EXPORTS', value:'OS'}]"
                    item-value="value"
                    item-text="text"
                    :rules="[
                      fieldIsRequired()
                    ]"
                    class="required_field"
                    label="Export information code"></v-autocomplete>
                </v-flex>
                <v-flex xs2>
                  <v-autocomplete
                    hide-details
                    :items="[{text: 'C33 - NO LICENSE REQUIRED (ALL OTHERS)', value: 'C33'}]"
                    item-value="value"
                    item-text="text"
                    :rules="[fieldIsRequired()]"
                    class="required_field"
                    v-model="commodityInEdit.licenseExceptionSymbol"
                    label="License exception symbol"></v-autocomplete>    
                </v-flex>
              </v-layout>
              <v-layout align-baseline justify-space-between>

                <v-flex xs2>
                  <v-autocomplete
                    hide-details
                    :items="countryCodeArray"
                    item-text="name"
                    item-value="value"
                    :rules="[fieldIsRequired()]"
                    class="required_field"
                    v-model="commodityInEdit.countryOfOrigin"
                    label="Country of origin"></v-autocomplete>
                </v-flex>
                <v-flex xs2>
                  <v-text-field
                    hide-details
                    label="ECCN"
                    v-model="commodityInEdit.eccn"></v-text-field>  
                </v-flex>
                <v-flex xs2>  
                  <v-text-field
                    hide-details
                    label="Total commodity weight"
                    v-model.number="commodityInEdit.commodityWeight"
                    :rules="[
                      fieldIsRequired('weight'), 
                      fieldIsNoLessThanZero('weight'),
                      isMeasurementMetric ? (() => true) : fieldIsPkgWeight(false)
                    ]"
                    class="required_field"
                    :suffix="isMeasurementMetric ? 'kg' : 'Lbs'"></v-text-field>
                </v-flex>
                <v-flex xs2>
                  <v-text-field
                    hide-details
                    class="required_field"
                    :rules="[fieldIsRequired(), fieldIsNoLessThanZero()]"
                    v-model.number="commodityInEdit.customsValue"
                    label="Total customs value($)"></v-text-field>    
                </v-flex>
              </v-layout>
            </v-form>
            <v-layout align-baseline justify-space-between>
              <v-flex xs2>
                <v-text-field
                  hide-details
                  :rules="[
                    fieldIsRequired(), 
                    fieldIsNoLessThanZero()
                  ]"
                  class="required_field"
                  v-model.number="commodityInEdit.quantity"
                  label="Quantity"
                  :suffix="qtySuffix"></v-text-field>  
              </v-flex>
              <v-flex xs2>
                <v-text-field
                  hide-details
                  :rules="[
                    fieldIsRequired(), 
                    fieldIsNoLessThanZero()
                  ]"
                  class="required_field"
                  v-model.number="commodityInEdit.quantity2"
                  label="Quantity"
                  v-if="isShowQty2"
                  :suffix="scheduleBMap[commodityInEdit.scheduleBCode].uom1"></v-text-field>
              </v-flex>
              <v-flex xs2 style="white-space: nowrap;">
                <span v-if="!isScheduleBReady"><v-icon>info</v-icon>Please wait, Loading schedule B...</span>
              </v-flex>
              <v-flex xs2>
              </v-flex>
            </v-layout>
            <v-layout justify-end align-baseline>
              <v-flex xs2>
                <v-text-field
                  v-if="isSaveCommodityProfile"
                  hide-details
                  v-model="commodityInEdit.profileName"
                  class="required_field"
                  :rules="[fieldIsRequired()]"
                  label="Profile name"></v-text-field>    
              </v-flex>
              <v-flex xs2>
                <v-checkbox label="Save commodity profile" hide-details class="checkbox" v-model="isSaveCommodityProfile"></v-checkbox>
              </v-flex>
              <v-btn dark color="primary" @click.stop="addCommodity">Add commodity</v-btn>
            </v-layout>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </div>

</template>

<script>
import { checkRules, timeTools, measurementTools } from '@/utils/tools'
import LoaderButton from './LoaderButton'

export default {
  name: 'CommodityWidget',
  components: {
    LoaderButton
  },
  data () {
    return {
      commodityInEdit: {
        commodityDescription: '',
        exportInformationCode: '',
        licenseExceptionSymbol: 'C33',
        profileName: '',
        countryOfOrigin: 'United States',
        scheduleBCode: '',
        customsValue: 0,
        commodityWeight: 0,
        quantity: 0,
        quantity2: 0,
        scheduleBDescription: ''
      },
      isSaveCommodityProfile: false,
      searchedCommodities: [],
      searchText: '',
      selectedCommodity: {},
      menuProfile: false,
      errorMessage: ''
    }
  },
  mixins: [checkRules, timeTools, measurementTools],
  beforeMount () {
    if (!this.scheduleBMap['0101210000']) {
      this.$store.dispatch('getAESHTS')
    }
  },
  computed: {
    countryCodeArray () {
      return this.$store.getters.countryCodeArray
    },
    commodityHeaders () {
      return [
        { text: 'Commodity', value: 'name', align: 'left', sortable: false, width: '5%' },
        { text: 'Schedule B code', value: 'scheduleBCode', align: 'left', sortable: false },
        { text: 'Export info code', value: 'exportInformationCode', align: 'left', sortable: false },
        { text: 'Country of origin', value: 'countryOfOrigin', align: 'left', sortable: false },
        { text: 'License exception symbol', value: 'licenseExceptionSymbol', align: 'left', sortable: false },
        { text: 'Customs value($)', value: 'value', align: 'left', sortable: false },
        { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
        { text: 'Quantity2', value: 'quantity2', align: 'left', sortable: false },
        { text: `Total weight(${this.isMeasurementMetric ? 'kg' : 'Lbs'})`, value: 'weight', align: 'center', sortable: false, width: '8%' },
        { text: 'Action', value: 'weight', align: 'center', sortable: false }
      ]
    },
    isMeasurementMetric () {
      return !!this.$store.getters.isMeasurementMetric
    },
    scheduleBMap () {
      return this.$store.getters.scheduleBMap
    },
    isShowQty2 () {
      return this.scheduleBMap[this.commodityInEdit.scheduleBCode] && this.scheduleBMap[this.commodityInEdit.scheduleBCode].uom1 !== 'NULL'
    },
    qtySuffix () {
      if (!this.scheduleBMap[this.commodityInEdit.scheduleBCode]) return ''
      if (this.scheduleBMap[this.commodityInEdit.scheduleBCode].uom === 'NO') {
        if (this.isEeiMode) {
          return 'number'
        }
        return 'pcs'
      } 
      return this.scheduleBMap[this.commodityInEdit.scheduleBCode].uom
    },
    isScheduleBReady () {
      return !!this.scheduleBMap['0101210000']
    }
  },
  methods: {
    onSelectCommodity (e) {
      const {createTime, lastModifiedTime, isMeasurementMetric = false, commodityWeight = 0, ...rest} = e
      Object.assign(this.commodityInEdit, rest, {
        commodityWeight: this.convertWeight(commodityWeight, isMeasurementMetric),
        isMeasurementMetric: this.isMeasurementMetric
      })
      this.isSaveCommodityProfile = false
    },
    convertWeight (weight, isMeasurementMetric) {
      if (!!isMeasurementMetric === !!this.isMeasurementMetric) {
        return weight
      }
      const convertFunc = this[`${isMeasurementMetric ? 'kg' : 'lbs'}_${this.$store.getters.isMeasurementMetric ? 'kg' : 'lbs'}`]
      return convertFunc(weight)
    },
    addCommodity () {
      this.errorMessage = ''
      if (!this.$refs[`form`].validate()) return
      if (this.value.length >= 10) {
        this.errorMessage = 'FedEx support maximum number of  10 entries.'
        return
      }
      if (this.isSaveCommodityProfile) {
        let target = this.searchedCommodities.find(item => item.profileName === this.commodityInEdit.profileName)
        const {quantity, quantity2, commodityWeight, customsValue, ...rest} = target || this.commodityInEdit
        if (target) {
          this.$store.dispatch('addCommodity', {rest, isUpdate: true})
          Object.assign(target, this.commodityInEdit, {isMeasurementMetric: this.isMeasurementMetric})
        } else {
          this.$store.dispatch('addCommodity', rest)
        }
        this.isSaveCommodityProfile = false
      }

      let newCommodity = {
        ...this.commodityInEdit
      }
      const matchedItem = this.scheduleBMap[this.commodityInEdit.scheduleBCode]
      if (matchedItem) {
        if (matchedItem.uom1 !== 'NULL') {
          newCommodity.unitOfMeasure2 = matchedItem.uom1
        }
        newCommodity.unitOfMeasure = matchedItem.uom === 'NO' ? (this.isEeiMode ? 'NO' : 'pieces') : matchedItem.uom
      }
      this.$emit('input', [...this.value, newCommodity])
    },
    async getCommodities () {
      this.searchedCommodities = await this.$store.dispatch('getCommodities', {keyword: this.searchText})
      this.menuProfile = true
    },
    deleteCommodity (item) {
      this.$emit('input', this.value.filter(ele => ele !== item))
    }
  },
  props: {
    value: Array,
    isEeiMode: Boolean
  }
}
</script>
