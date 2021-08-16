<template>
  <v-container fluid>
    <v-layout class="headline">Public Base rates</v-layout>
    <v-layout v-if="!displayMode">
      <v-flex md2>
        <v-btn color="primary" class="edit" @click="showBillingBaseRatesDialog">Edit</v-btn>
      </v-flex>
    </v-layout>
    <v-layout>
      <v-flex>
        <v-card>
          <v-card-text>
            <v-container fluid grid-list-lg>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Inbound per package: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{packageRates && packageRates.inbound}}</v-flex>
                <v-flex md3 class="text-xs-right">Outbound per package:</v-flex>
                <v-flex md1 class="text-xs-left">$ {{packageRates && packageRates.outbound}}</v-flex>
                <v-flex md3></v-flex>
                <v-flex md1></v-flex>
              </v-layout>
              <v-layout 
                justify-space-between 
                v-for="item in unitRates" 
                :key="item.sortKey">
                <v-flex md3 class="text-xs-right text-capitalize">{{ item.name }} item inbound per unit:</v-flex>
                <v-flex md1 class="text-xs-left">$ {{ item.inbound }}</v-flex>
                <v-flex md3 class="text-xs-right text-capitalize">{{ item.name }} item outbound per unit:</v-flex>
                <v-flex md1 class="text-xs-left">$ {{ item.outbound }}</v-flex>
                <v-flex md3 class="text-xs-right text-capitalize">{{ item.name }} item storage daily:</v-flex>
                <v-flex md1 class="text-xs-left">$ {{ item.storage }}</v-flex>
              </v-layout>
            </v-container>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
    <v-layout headline mt-5>Public Other Service Rates</v-layout>
    <v-layout  v-if="!displayMode">
      <v-flex md2>
        <v-btn color="primary" class="edit" @click="showBillingOtherRatesDialog">Edit</v-btn>
      </v-flex>
    </v-layout>
    <v-layout>
      <v-flex>
        <v-card>
          <v-card-text>
            <v-container fluid grid-list-lg>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Expedite package: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.expeditePackageFee}}</v-flex>
                <v-flex md8></v-flex>
              </v-layout>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Small item label per unit</v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.smallItemLabelFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Medium item label per unit</v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.mediumItemLabelFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Large item label per unit</v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.largeItemLabelFee}}</v-flex>
              </v-layout>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Small item photo: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.smallItemPhotoFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Medium item photo: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.mediumItemPhotoFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Large item photo: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.largeItemPhotoFee}}</v-flex>
              </v-layout>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Quantity per small item photo: </v-flex>
                <v-flex md1 class="text-xs-left">{{otherRates.smallItemPhotoQuantity}}</v-flex>
                <v-flex md3 class="text-xs-right">Quantity per medium item photo: </v-flex>
                <v-flex md1 class="text-xs-left">{{otherRates.mediumItemPhotoQuantity}}</v-flex>
                <v-flex md3 class="text-xs-right">Quantity per large item photo: </v-flex>
                <v-flex md1 class="text-xs-left">{{otherRates.largeItemPhotoQuantity}}</v-flex>
              </v-layout>
              <v-layout justify-space-between>
                <v-flex md3 class="text-xs-right">Small item SN per unit: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.smallItemSNFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Medium item SN per unit: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.mediumItemSNFee}}</v-flex>
                <v-flex md3 class="text-xs-right">Large item SN per unit: </v-flex>
                <v-flex md1 class="text-xs-left">$ {{otherRates.largeItemSNFee}}</v-flex>
              </v-layout>
            </v-container>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
    <div v-if="!displayMode">
      <v-layout class="headline mt-5">Discount Schedule</v-layout>
      <v-layout>
        <v-flex>
          <v-btn dark color="primary" class="add" @click="showEditDiscountDialog({})">Add</v-btn>
          <v-data-table
            :headers="headers"
            :items="tierDiscounts"
            item-key="reportKey"
            :pagination.sync="pagination"
            class="elevation-2 myDense"
          >
            <template v-slot:items="props">
                <td class="subheading">{{ props.item.name }}</td>
                <td class="subheading">{{ props.item.threshold }}</td>
                <td class="text-xs-left">{{ props.item.discountRate }}</td>
                <td class="text-xs-center">
                  <v-layout>
                    <v-flex><v-btn dark color="primary" flat @click.stop="showEditDiscountDialog(props.item)">Edit</v-btn></v-flex>
                    <v-flex><v-btn dark color="secondary" flat @click.stop="deleteDiscount(props.item)">Delete</v-btn></v-flex>
                  </v-layout>
                </td>
            </template>
          </v-data-table>
        </v-flex>
      </v-layout>
    </div>
    <FormSubmitPopup
      title="Edit base billing rates"
      v-model="baseBillingRatesDialog"
      v-if="baseBillingRatesDialog"
      large
      @popupClose="baseBillingRatesDialog = false"
      :rightMethod="onBaseRatesChangeSubmitted"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex md2>
              <v-text-field
                label="Inbound per package"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="ratesInEdit.packageRates.inbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Outbound per package"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="ratesInEdit.packageRates.outbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2></v-flex>
            <v-flex md2></v-flex>
            <v-flex md2></v-flex>
          </v-layout>
          <v-layout 
            justify-space-between
            v-for="item in ratesInEdit.unitRates.slice(0, 3)" 
            :key="item.sortKey"
            align-center>
            <v-flex md2 class="subheading">{{ item.name }}</v-flex>
            <v-flex md2>
              <v-text-field
                label="Inbound per unit"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.inbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Outbound per unit"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.outbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Storage daily"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.storage"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2></v-flex>
          </v-layout>
          <v-layout 
            justify-space-between
            v-for="item in addedLevelRatesInEdit" 
            :key="item.sortKey"
          >
            <v-flex md2>
              <v-text-field
                label="Name"
                :rules="[fieldIsRequired(), (val) => nameMap.get(val) <= 1 || 'Name can not be duplicated.' ]"
                v-model.number="item.name"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Inbound per unit:"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.inbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Outbound per unit:"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.outbound"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Storage daily:"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="item.storage"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-btn small color="red" icon flat @click.stop="deleteNewRateLevel(item)"><v-icon dark>cancel</v-icon></v-btn>
            </v-flex>
          </v-layout>
          <v-layout justify-space-between>
            <v-btn color="primary" @click="addNewRateLevel">
              <v-icon>add</v-icon> Level
            </v-btn>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <FormSubmitPopup
      title="Edit other service billing rates"
      v-model="otherServiceBillingRatesDialog"
      v-if="otherServiceBillingRatesDialog"
      large
      @popupClose="otherServiceBillingRatesDialog = false"
      :rightMethod="onOtherServiceRatesChangeSubmitted"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex md3>
              <v-text-field
                label="Expedite package fee"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.expeditePackageFee"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-space-between>
            <v-flex md3>
              <v-text-field
                label="Small item label per unit"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.smallItemLabelFee"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Medium item label per unit"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.mediumItemLabelFee"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Large item label per unit"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.largeItemLabelFee"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-space-between>
            <v-flex md3>
              <v-text-field
                label="Small item photo fee"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.smallItemPhotoFee"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Medium item photo fee"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.mediumItemPhotoFee"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Large item photo fee"
                prefix="$"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.largeItemPhotoFee"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-space-between>
            <v-flex md3>
              <v-text-field
                label="Quantity per small item photo"
                prefix="#"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.smallItemPhotoQuantity"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Quantity per medium item photo"
                prefix="#"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.mediumItemPhotoQuantity"
                class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
                label="Quantity per large item photo"
                prefix="#"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                v-model.number="otherRatesInEdit.largeItemPhotoQuantity"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-space-between>
            <v-flex md3>
              <v-text-field
              label="Small item SN per unit"
              prefix="$"
              :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
              v-model.number="otherRatesInEdit.smallItemSNFee"
              class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
              label="Medium item SN per unit"
              prefix="$"
              :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
              v-model.number="otherRatesInEdit.mediumItemSNFee"
              class="required_field"></v-text-field>
            </v-flex>
            <v-flex md3>
              <v-text-field
              label="Large item SN per unit"
              prefix="$"
              :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
              v-model.number="otherRatesInEdit.largeItemSNFee"
              class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <FormSubmitPopup
      title="Discount"
      v-model="editDiscountDialog"
      v-if="editDiscountDialog"
      @popupClose="editDiscountDialog = false"
      :rightMethod="editDiscount"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-center>
            <v-flex md6>
              <v-text-field
                label="Name"
                :rules="[fieldIsRequired('Name'), fieldCheckDup('name')]"
                v-model.number="discountInEdit.name"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-center>
            <v-flex md6>
              <v-text-field
                label="Threshold"
                prefix="$"
                :rules="[fieldIsRequired('Threshold'), fieldIsNumber('Threshold'), fieldCheckDup('threshold')]"
                v-model.number="discountInEdit.threshold"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-center>
            <v-flex md6>
              <v-text-field
                label="Off"
                suffix="%"
                v-model.number="discountInEdit.discountRate"
                :rules="[fieldIsRequired(), fieldIsNoLessThanZero(), fieldIsNumber()]"
                hint="Hint: 0-100"
                class="required_field"></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules, cloneDeep } from '@/utils/tools'

export default {
  name: 'BillingSettings',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      headers: [
        { text: 'Name', align: 'left', sortable: true, value: 'name' },
        { text: 'Threshold($)', align: 'left', sortable: true, value: 'threshold' },
        { text: 'Off(%)', value: '', align: 'left', sortable: false },
        { text: 'Action', value: 'note', align: 'center', sortable: false, width: '10%' }
      ],
      ratesInEdit: {}, 
      otherRatesInEdit: {},
      discountInEdit: {},
      baseBillingRatesDialog: false,
      otherServiceBillingRatesDialog: false,
      editDiscountDialog: false,
      pagination: {
        sortBy: 'threshold',
        descending: true
      },
      addedLevelRatesInEdit: []
    }
  },
  computed: {
    warehouseLimitedInfo () {
      return this.$store.getters.warehouseLimitedInfo
    },
    rates () {
      return this.warehouseLimitedInfo.rates
    },
    packageRates () {
      return this.rates.packageRates
    },
    unitRates () {
      return this.rates.unitRates
    },
    otherRates () {
      return this.warehouseLimitedInfo.otherRates || {}
    },
    tierDiscounts () {
      let {tierDiscounts} = this.warehouseLimitedInfo
      if (tierDiscounts) {
        return Object.keys(tierDiscounts).map(key => {
          return {key, ...tierDiscounts[key]}
        })
      } else return []
    },
    usedLevelSet () {
      return new Set(Object.values(this.$store.getters.upcMap).map(item => item.size))
    },
    nameMap () {
      let map = new Map()
      this.addedLevelRatesInEdit.forEach(item => {
        if (!map.has(item.name)) {
          map.set(item.name, 0)
        }
        map.set(item.name, map.get(item.name) + 1)
      })
      return map
    }
  },
  methods: {
    showBillingBaseRatesDialog () {
      this.baseBillingRatesDialog = true
      this.ratesInEdit = cloneDeep(this.rates)
      if (this.unitRates.length > 3) {
        this.addedLevelRatesInEdit = cloneDeep(this.unitRates.slice(3))
      }
    },
    showBillingOtherRatesDialog () {
      this.otherServiceBillingRatesDialog = true
      this.otherRatesInEdit = {...this.otherRates}
    },
    showEditDiscountDialog (item) {
      this.editDiscountDialog = true
      this.discountInEdit = {...item}
    },
    onBaseRatesChangeSubmitted () {
      this.ratesInEdit.unitRates = [...this.ratesInEdit.unitRates.slice(0, 3), ...this.addedLevelRatesInEdit]
      return this.$store.dispatch('updateBillingRates', this.ratesInEdit)
    },
    onOtherServiceRatesChangeSubmitted () {
      return this.$store.dispatch('updateBillingOtherRates', this.otherRatesInEdit)
    },
    editDiscount () {
      return this.$store.dispatch('editTierDiscount', this.discountInEdit)
    },
    deleteDiscount (item) {
      if (!confirm('Deleting discount tier will remove it from organization that assigned to it. Please use “Edit” instead for updating this tier. Do you still want to delete?')) return Promise.resolve()
      return this.$store.dispatch('editTierDiscount', {...item, isDelete: true})
    },
    fieldCheckDup (fieldName) {
      return (v) => !this.tierDiscounts.some(item => (item.key !== this.discountInEdit.key && item[fieldName] === v)) || `Duplicated ${fieldName}, please check.`
    },
    addNewRateLevel () {
      if (this.addedLevelRatesInEdit.length) {
        this.addedLevelRatesInEdit.push({
          sortKey: this.addedLevelRatesInEdit[this.addedLevelRatesInEdit.length - 1].sortKey + 1
        })
      } else {
        this.addedLevelRatesInEdit.push({
          sortKey: 4
        })
      }
    },
    deleteNewRateLevel (item) {
      if (!confirm('Are you sure to delete this level?')) return
      if (this.usedLevelSet.has(item.sortKey)) return alert('Level being used cannot be deleted')
      this.addedLevelRatesInEdit = this.addedLevelRatesInEdit.filter(level => {
        return item.sortKey !== level.sortKey
      })
    }
  },
  props: {
    displayMode: {
      type: Boolean,
      default: () => {
        return false
      }
    }
  }
}
</script>
