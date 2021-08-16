<template>
  <FormSubmitPopup
    :title="isReadOnly ? 'Audit detail' : 'Edit audit'"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Save"
    :rightButtonDisabled="isLoading"
    :hideRgtBtn="isReadOnly"
    hasAlert
    large
  >
    <template v-slot:input>
      <v-container fluid>
        <v-alert
          v-model="showSuccessAlert"
          dismissible
          type="success">{{alertMsg}}</v-alert>
        <v-layout align-center>
          <v-flex xs4>
            <v-text-field
              append-icon="filter_list"
              class="text-xs-right"
              label="Search"
              single-line
              clearable
              hide-details
              v-model="filter"
            ></v-text-field>
          </v-flex>
          <v-flex xs1></v-flex>
          <v-flex xs1>
            <v-checkbox label="Unmatched" v-model="showUnmatched"></v-checkbox>
          </v-flex>
          <v-flex xs1></v-flex>
          <v-flex xs1>
            <v-checkbox label="Confirmed" v-model="showConfirmed"></v-checkbox>
          </v-flex>
          <v-flex xs1></v-flex>
          <v-flex xs1 v-if="!isReadOnly">
            <LoaderButton
              v-model="isLoading"
              buttonText="Sync inventory"
              :promiseAwait="syncInventory"
            ></LoaderButton>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="headers"
          class="elevation-2 myDense"
          :search="filter"
          :items="items"
          item-key="key"
          :rows-per-page-items="[25, 50, {text: 'All', value: -1}]"
        >
          <template v-slot:items="props">
            <td class="text-xs-left">{{ props.item.upc }}</td>
            <td class="text-xs-left">{{ upcToProductMap[props.item.upc] && upcToProductMap[props.item.upc].description }}</td>
            <td class="text-xs-left">{{ props.item.qty }} / {{props.item.abnormalQty || 0}}</td>
            <td class="text-xs-left">
              <v-layout justify-space-between v-if="!isReadOnly">
                <v-flex xs5>
                  <v-text-field
                    :class="getTextClass(props.item.auditQty, props.item.qty, props.item.isConfirmed)"
                    single-line
                    hide-details
                    v-model.number="props.item.auditQty"
                    :rules="[fieldIsNumber()]"
                  ></v-text-field>
                </v-flex>
                <v-flex xs5>
                  <v-text-field
                    :class="getTextClass(props.item.abnormalAuditQty, props.item.abnormalQty, props.item.isConfirmed)"
                    single-line
                    hide-details
                    v-if="!isReadOnly"
                    v-model.number="props.item.abnormalAuditQty"
                    :rules="[fieldIsNumber()]"
                  ></v-text-field>
                </v-flex>
              </v-layout>
              <v-layout v-else>
                <span :style="getTextStyle(props.item.auditQty, props.item.qty, props.item.isConfirmed)">
                  {{ props.item.auditQty }}
                </span>/
                <span :style="getTextStyle(props.item.abnormalAuditQty, props.item.abnormalQty, props.item.isConfirmed)">
                  {{props.item.abnormalAuditQty}}
                </span>
              </v-layout>
            </td>
            <td class="text-xs-center">
              <v-layout justify-center align-baseline>
                <v-flex xs1>
                  <v-checkbox 
                    v-model="props.item.isConfirmed" 
                    style="position: relative; left: -5px; top: 15px;"
                    v-if="!isReadOnly"
                  ></v-checkbox>
                  <v-icon v-else-if="props.item.isConfirmed">check_circle</v-icon>
                </v-flex>
              </v-layout>
            </td>
            <td class="text-xs-left">
              <v-combobox
                class="table-item"
                v-model="props.item.location"
                chips
                multiple
                deletable-chips
                v-if="!isReadOnly"
                clearable></v-combobox>
              <v-layout v-else>{{ props.item.location }}</v-layout>
            </td>
            <td class="text-xs-center">
              <v-text-field
                class="table-item"
                single-line
                hide-details
                v-model="props.item.note"
                v-if="!isReadOnly"
              ></v-text-field>
              <v-layout v-else>{{ props.item.note }}</v-layout>
            </td>
          </template>
        </v-data-table>
      </v-container>
    </template>
  </FormSubmitPopup>
</template> 

<script>
import FormSubmitPopup from './FormSubmitPopup'
import LoaderButton from './LoaderButton'
import { checkRules, cloneDeep } from '@/utils/tools'

export default {
  name: 'WarehouseAuditEditPopup',
  components: {
    FormSubmitPopup,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      filter: '',
      headers: [
        { text: 'UPC', align: 'left', sortable: false, value: 'upc' },
        { text: 'Product name', align: 'left', sortable: false, value: 'keywordString' },
        { text: 'Quantity (Normal/Abnormal)', value: 'qty', align: 'left', sortable: false },
        { text: 'Audit qty (Normal/Abnormal)', value: 'auditQty', align: 'left', sortable: false, width: '10%' },
        { text: 'Confirmed', value: 'status', align: 'center', sortable: false },
        { text: 'Location', value: '', align: 'left', sortable: false },
        { text: 'Note', value: 'note', align: 'left', sortable: false, width: '20%' }
      ],
      showSuccessAlert: false,
      auditRecord: {},
      showUnmatched: false,
      showConfirmed: false,
      isLoading: false,
      alertMsg: '',
      alertMsgArr: ['Save success.', "Sync inventory success. Click 'Save' to update record."]
    }
  },
  mounted () {
    this.auditRecord = cloneDeep(this.initRecord)
  },
  computed: {
    items () {
      let rtn = this.auditRecord.upcs || []
      rtn.forEach(item => {
        if (this.upcToProductMap[item.upc]) {
          item.keywordString = this.upcToProductMap[item.upc].description || ''
        }
      })
      if (this.showUnmatched) {
        rtn = rtn.filter(item => item.qty !== item.auditQty || item.abnormalQty !== item.abnormalAuditQty)
      }
      if (this.showConfirmed) {
        rtn = rtn.filter(item => item.isConfirmed)
      }
      return rtn
    },
    isReadOnly () {
      return this.auditRecord.status === 'done'
    },
    upcToProductMap () {
      return this.$store.getters.upcMap
    }
  },
  methods: {
    async onSubmitted () {
      this.showSuccessAlert = false
      let {status, newUpcs} = await this.$store.dispatch('saveAudit', {upcs: this.auditRecord.upcs || [], _key: this.auditRecord._key, initUpcs: this.initRecord.upcs})
      if (status === 'reverse') {
        this.auditRecord.upcs = this.initRecord.upcs
      } else {
        this.auditRecord.upcs = newUpcs
      }
      this.alertMsg = this.alertMsgArr[0]
      this.showSuccessAlert = true
      this.$emit('onSubmitted', {target: this.initRecord, upcs: cloneDeep(this.auditRecord.upcs) || []})
      return 'keepPopup'
    },
    getTextClass (auditQty, qty, isConfirmed) {
      if (!isConfirmed) return 'table-item'
      if (auditQty > qty) {
        return 'table-item text-green'
      }
      if (auditQty === qty) {
        return 'table-item'
      }
      return 'table-item text-red'
    },
    getTextStyle (auditQty, qty, isConfirmed) {
      if (!isConfirmed) return ''
      if (auditQty > qty) {
        return 'color: green;'
      }
      if (auditQty === qty) {
        return ''
      }
      return 'color: red;'
    },
    async syncInventory () {
      if (!confirm("Sync inventory will update this audit's unconfirmed upcs with current inventory. Are you sure to continue?")) return 'skip'
      this.showSuccessAlert = false
      const {upcs} = await this.$store.dispatch('syncAuditInventory', {siteKey: this.initRecord.siteKey, auditRecord: this.auditRecord}) 
      this.auditRecord.upcs = upcs
      this.alertMsg = this.alertMsgArr[1]
      this.showSuccessAlert = true
    }
  },
  props: {
    value: Boolean,
    initRecord: Object
  }
}
</script>

<style>
.table-item {
  padding-bottom: 12px;
}

.text-red.theme--light.v-input:not(.v-input--is-disabled) input {
  color: red;
}

.text-green.theme--light.v-input:not(.v-input--is-disabled) input {
  color: green;
}
</style>
