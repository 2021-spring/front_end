<template>
  <FormSubmitPopup
    :title="title"
    medium
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    :rightButtonText="btnText"
    :rightButtonDisabled="!isWarehouse"
  >
    <template v-slot:input>
      <v-layout justify-space-around wrap>
        <v-flex xs4 md4 px-2>
          <v-autocomplete
            v-if="editMode"
            clearable
            :class="orgKey !== packageInfo.organizationKey ? 'package highlight' : ''"
            name="Org"
            label="Organization ID"
            v-model="orgKey"
            item-text="organizationId"
            item-value="key"
            :items="organizations"
          ></v-autocomplete>
          <v-text-field
            v-else
            name="Org"
            label="Organization ID"
            :value="(organizations.find(({key}) => key === orgKey) || {}).organizationId"
            disabled
            outline
          ></v-text-field>
        </v-flex>
        <v-flex xs8 md4 px-2>
          <v-text-field
            name="trackingNumber"
            label="tracking number"
            v-model="trackings"
            :outline="!editMode"
            disabled
          ></v-text-field>
        </v-flex>
        <v-flex xs6 md4 px-2>
          <v-text-field
            name="UPC"
            label="UPC"
            :value="packageInfo.upc"
            :outline="!editMode"
            disabled
          ></v-text-field>
        </v-flex>
        <v-flex xs6 md4 px-2>
          <v-text-field
            name="totalQty"
            label="Total quantity"
            :value="(abnormalQty + normalQty)"
            :outline="!editMode"
            disabled
          ></v-text-field>
        </v-flex>
        <v-flex xs6 md4 px-2>
          <v-text-field
            name="abnormalQty"
            label="Abnormal Quantity"
            :class="abnormalQty !== packageInfo.abnormalQty ? 'package highlight' : ''"
            v-model.number="abnormalQty"
            :rules="[fieldIsRequired('Abnormal Quantity'), fieldIsInteger('Abnormal Quantity'), fieldIsNoLessThanZero('Abnormal Quantity')]"
            :disabled="!editMode"
            :outline="!editMode"
          ></v-text-field>
        </v-flex>
        <v-flex xs6 md4 px-2>
          <v-text-field
            name="normalQty"
            label="Normal quantity"
            :class="normalQty !== packageInfo.normalQty ? 'package highlight' : ''"
            v-model.number="normalQty"
            :rules="[fieldIsRequired('Normal quantity'), fieldIsInteger('Normal quantity'), fieldIsNoLessThanZero('Normal quantity')]"
            :disabled="!editMode"
            :outline="!editMode"
          ></v-text-field>
        </v-flex>
        <v-flex v-if="editMode" xs12 px-2>
          <v-checkbox label="Modify balance" v-model="isModifyFee"></v-checkbox>
        </v-flex>
        <template v-if="!editMode">
          <v-flex xs6 md6 px-2>
            <v-text-field
              name="AbnormalReturnQty"
              label="Return quantity"
              v-model.number="abnormalReturnQty"
              :rules="[fieldIsInteger('Return quantity'), fieldIsNoLessThanZero('Return quantity'), checkReturnQuantity]"
            ></v-text-field>
          </v-flex>
          <v-flex xs6 md6 px-2>
            <v-text-field
              name="AbnormalToNormalQty"
              label="Inbound quantity"
              v-model.number="abnormalAcceptedQty"
              readonly
            ></v-text-field>  
          </v-flex>
          <v-flex xs12 px-2>
            <v-textarea
              label="Resolve note"
              :hint="packageInfo.note"
              v-model="newNote"
              outline
            ></v-textarea>
          </v-flex>
        </template>
        <v-flex my-1 px-2 xs12 v-else-if="isModifyFee">
          <v-layout justify-space-between v-for="item in recommendations" :key="item.organizationId">
            <v-flex md2>
              <v-text-field
                label="Organization ID"
                readonly
                outline
                class="thinBox"
                v-model="item.organizationId"
              ></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Storage fee"
                readonly
                outline
                class="thinBox"
                v-model="item.storageFee"
              ></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Inbound fee"
                readonly
                outline
                class="thinBox"
                v-model="item.inboundFee"
              ></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Discount rate"
                readonly
                outline
                class="thinBox"
                v-model="item.discountRate"
              ></v-text-field>
            </v-flex>
            <v-flex md2>
              <v-text-field
                label="Total fee"
                readonly
                outline
                class="thinBox"
                v-model="item.total"
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout justify-start row no-wrap>
            <v-flex
              v-for="item in recommendations" :key="item.organizationKey"
              xs3 md6 px-2>
              <v-text-field
                :label="'Amount of ' + item.organizationId"
                prefix="$"
                class="required_field"
                v-model.number="modifyFee[item.organizationKey]"
                :rules="[fieldIsNumber('Amount')]"
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-flex>
        <template v-if="editMode">
           <v-flex xs12
            :md6="isModifyFee && recommendations.length"
            px-2>
            <v-textarea
              label="Note"
              v-model="note"
              outline
            />
          </v-flex>
          <v-flex
            v-if="isModifyFee && recommendations.length"
            xs12 md6 px-2>
            <v-textarea
              label="Adjust balance note"
              v-model="adjustBalanceNote"
              outline
            />
          </v-flex>
        </template>
        <v-list-tile-content v-if="errorMsg">
          <v-list-tile-sub-title class='red--text'>
            {{errorMsg}}
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from '@/components/FormSubmitPopup'
import {checkRules} from '@/utils/tools'
import {differenceInDays, startOfDay, isSameDay, addDays} from 'date-fns'

export default {
  name: 'AbnormalPackage',
  components: {FormSubmitPopup},
  mixins: [checkRules],
  data () {
    return {
      abnormalQty: 0,
      normalQty: 0,
      abnormalAcceptedQty: 0,
      abnormalReturnQty: 0,
      orgKey: '',
      newNote: '',
      note: '',
      isModifyFee: true,
      modifyFee: {},
      adjustBalanceNote: `Adjust: update package ${this.packageInfo.trackings[0]}`,
      errorMsg: '',
      recommendations: [],
      errorMsgs: {
        'error-solved-quantity': 'Please fill in accepted quantity or return quantity',
        'package-has-been-resolved': 'This package has been resolved'
      }
    }
  },
  mounted () {
    this.abnormalAcceptedQty = this.packageInfo.quantity
    this.orgKey = this.packageInfo.organizationKey
    this.note = this.packageInfo.note
    this.abnormalQty = this.packageInfo.abnormalQty
    this.normalQty = this.packageInfo.normalQty
    this.abnormalReturnQty = this.abnormalQty
  },
  watch: {
    abnormalReturnQty (v) {
      this.abnormalAcceptedQty = this.packageInfo.quantity - v
    },
    recommendations (v) {
      this.$set(this, 'modifyFee', {})
      v.forEach(({organizationKey, total}) => {
        if (organizationKey) {
          this.$set(this.modifyFee, organizationKey, total)
        }
      })
    },
    packageInfoChange () {
      this.getRecommadations()
    }
  },
  computed: {
    trackings () {
      return (this.packageInfo.trackings || []).join(', ')
    },
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    organizations () {
      return this.$store.getters.sortedWarehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    btnText () {
      return this.editMode ? 'Confirm' : 'Resolve'
    },
    packageInfoChange () {
      const {quantity, normalQty, abnormalQty, note, organizationKey} = this.packageInfo
      let change = {isChange: false, _old: {}, _new: {}}
      if (
        this.abnormalQty !== abnormalQty ||
        this.normalQty !== normalQty
      ) {
        change = { 
          isChange: true,
          _old: {quantity, normalQty, abnormalQty}, 
          _new: {
            quantity: (this.abnormalQty + this.normalQty),
            normalQty: this.normalQty,
            abnormalQty: this.abnormalQty
          }
        }
      }
      if (this.note !== note) {
        change.isChange = true
        change._old.note = note
        change._new.note = this.note
      }
      if (this.orgKey !== organizationKey) {
        change.isChange = true
        change._old.organizationKey = organizationKey
        change._new.organizationKey = this.orgKey
      }
      return change
    }
  },
  methods: {
    async getRecommadations () {
      this.normalQty = this.normalQty || 0
      this.abnormalQty = this.abnormalQty || 0
      const changes = this.orgChanges()
      if (!this.editMode || !changes) this.recommendations = []
      else {
        this.recommendations = await this.$store
          .dispatch('updatePackageAdjustBalanceRecommendations', changes)
      }
      return true
    },
    onSubmitted () {
      try {
        return this.editMode ? this.fixPackage() : this.resolve()
      } catch (error) {
        this.errorMsg = this.errorMsgs[error.message] || 'Undefined error'
        setTimeout(() => {
          this.errorMsg = ''
        }, 3000)
        throw error
      }
    },
    resolve () {
      if (this.abnormalAcceptedQty + this.abnormalReturnQty === 0) {
        throw Error('error-resolved-quantity')
      }
      return this.$store.dispatch('resolveAbnormalPackage', {
        acceptedQty: this.abnormalAcceptedQty,
        returnQty: this.abnormalReturnQty,
        key: this.packageKey,
        note: this.newNote,
        oldPackage: this.packageInfo
      })
    },
    fixPackage () {
      const {normalQty, abnormalQty, note, orgKey} = this 
      return this.$store.dispatch('updateAbnormalPackage', {
        key: this.packageKey,
        change: {
          isChange: this.packageInfoChange.isChange,
          _old: this.packageInfo,
          _new: {
            normalQty, 
            abnormalQty, 
            note: this.isModifyFee ? note + '\n------------------------\n' + this.adjustBalanceNote : note, 
            organizationKey: orgKey,
            quantity: abnormalQty + normalQty
          }
        },
        logPayload: this.packageChange()
      })
        .then(change => {
          // after updatepackageInfo then fix fee 
          if (this.isModifyFee && Object.keys(this.modifyFee).length) {
            return Promise.all(
              Object.keys(this.modifyFee).map(orgKey => this.$store.dispatch(
                'adjustWarehouseBalance', {
                  note: this.adjustBalanceNote,
                  amount: this.modifyFee[orgKey],
                  type: 'adjust',
                  tenantKey: orgKey
                }
              ))
            )
          }
          return true
        })
    },
    checkReturnQuantity (v) {
      return v <= this.packageInfo.quantity || 'Return quantity must less than total quantity'
    },
    packageChange () {
      let oldPackage = this.packageInfo.getData()
      let newPackage = {...oldPackage}
      const {_new} = this.packageInfoChange
      newPackage.organizationKey = this.orgKey || ''
      newPackage.quantity = _new.quantity >= 0 ? _new.quantity : newPackage.quantity
      newPackage.abnormalQty = _new.abnormalQty >= 0 ? _new.abnormalQty : newPackage.abnormalQty
      newPackage.normalQty = _new.normalQty >= 0 ? _new.normalQty : newPackage.normalQty
      return {oldPackage, newPackage}
    },
    orgChanges () {
      let changes = {}
      if (!this.packageInfoChange.isChange) return {}
      const {oldPackage, newPackage} = this.packageChange()
      if (oldPackage.organizationKey !== '') {
        let {organizationKey, upc, quantity, createTime} = oldPackage
        let cur = new Date()
        let createDate = new Date(createTime)
        let storageDays = differenceInDays(cur, createDate)
        storageDays += isSameDay(startOfDay(cur), startOfDay(addDays(createDate, 7))) ? 0 : 1

        if (changes[organizationKey] === undefined) {
          changes[organizationKey] = {[upc]: 0, pkg: 0, unit: {}}
        } else if (changes[organizationKey][upc] === undefined) {
          changes[organizationKey][upc] = 0
        }
        changes[organizationKey][upc] -= quantity * storageDays
        changes[organizationKey].pkg--
        if (!changes[organizationKey].unit[upc]) {
          changes[organizationKey].unit[upc] = 0
        }
        changes[organizationKey].unit[upc] -= quantity
      }
      // add new pkg qty
      if (newPackage.organizationKey !== '') {
        let {organizationKey, upc, quantity, createTime} = newPackage
        let cur = new Date()
        let createDate = new Date(createTime)
        let storageDays = differenceInDays(cur, createDate)
        storageDays += isSameDay(startOfDay(cur), startOfDay(addDays(createDate, 7))) ? 0 : 1

        if (changes[organizationKey] === undefined) {
          changes[organizationKey] = {[upc]: 0, pkg: 0, unit: {}}
        } else if (changes[organizationKey][upc] === undefined) {
          changes[organizationKey][upc] = 0
        }
        changes[organizationKey][upc] += quantity * storageDays
        changes[organizationKey].pkg++
        if (!changes[organizationKey].unit[upc]) {
          changes[organizationKey].unit[upc] = 0
        }
        changes[organizationKey].unit[upc] += quantity
      }
      return changes
    }
  },
  props: {
    value: Boolean,
    packageInfo: {
      type: Object,
      default () {
        return {
          trackings: [],
          upc: '',
          quantity: 0,
          normalQty: 0,
          abnormalQty: 0,
          returnQty: 0,
          errorMsg: '',
          note: '',
          organizationId: ''
        }
      }
    },
    packageKey: {
      type: String,
      default: ''
    },
    editMode: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Abnormal package'
    }
  }
}
</script>
