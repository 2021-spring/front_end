<template>
  <div>
    <PaginationController
      ref="tableController"
      v-model="warehouseTransactions"
      :getDataActionName="warehouseKey === 'system' ? 'getSystemTransactionsPagination' : `getWarehouseTransactionsPagination`"
      :actionPredicates="actionPredicates"
      :historyLimit="historyLimit"
      :haveStartDate="true"
      :select="transactionType"
      :outsideScrollToBottom="outsideScrollToBottom"
      :haveSearchBox="warehouseKey === 'system'"
      searchBoxLabel="Search for keywords"
    >
      <template v-slot:dataTable>
        <v-data-table
          :headers="headers"
          :items="warehouseTransactions"
          class="elevation-1"
          hide-actions>
          <template v-slot:items="{item}">
            <td class="text-xs-left">{{ toTimestampString(item.createTime) }}</td>
            <td class="text-xs-left text-capitalize">
              {{ `${item.transactionType || (item.type === 'label' ? 'Fee' : item.type)}${item.subtype ? ` - ${item.subtype.toUpperCase()}` : ''}` }}
            </td>
            <td class="text-xs-left">
              <template v-if="item.transactionType === 'deposit' || item.type === 'deposit'">
                <v-layout>{{item.cardType}} - ***** {{item.last4}}</v-layout>
                <v-layout><div style="width: 55px">Deposit:</div><div>${{item.amount}}</div></v-layout>
                <v-layout v-if="item.bonuses && item.bonuses.details.length > 0"><div style="width: 55px">Bonus:</div><div>{{item.bonuses.details.map(promotion => `$${promotion.bonus}`).join(' + ')}}</div></v-layout>
              </template>
              <template v-else>
                <div class="billing-note">{{ item.note }}</div>
              </template>
            </td>
            <td v-if="item.amount || item.amount === 0" class="text-xs-left" :style="`color: ${item.amount > 0 ? 'green' : 'red'}`">
              <template v-if="item.bonuses && item.bonuses.details.length > 0">
                ${{ item.amount + item.bonuses.total }}
              </template>
              <template v-else>
                ${{ item.amount }}
              </template>
            </td>
            <td v-else-if="item.type === 'label'" class="text-xs-left" :style="`color: ${item.totalAmount > 0 ? 'red': 'green'}`">
              ${{ item.type === 'label' ? -item.totalAmount : item.amount }}
            </td>
            <td v-else class="text-xs-left" :style="`color: ${item.amount <= 0 || item.totalAmount > 0 ? 'green' : 'red'}`">
              ${{ item.amount || -item.totalAmount }}
            </td>
            <td class="text-xs-left">${{ item.newBalance }}</td>
            <td class="text-xs-left" v-if="!isTenant">
              <v-layout v-if="item.operator">
                {{ item.operator }}
              </v-layout>
            </td>
            <td class="text-xs-center">
              <v-layout>
                <v-flex v-if="['fee', 'deposit'].includes(item.transactionType || item.type)"><v-btn color="primary" flat @click.stop="showTransactionDetail(item)">Details</v-btn></v-flex>
                <v-flex v-if="warehouseKey === 'system' && ['adjust', 'label'].includes(item.type) && item.details"><v-btn color="primary" flat @click.stop="showTransactionDetail(item)">Details</v-btn></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </template>
      <template v-slot:beforeSearchBox v-if="warehouseKey === 'system'">
        <v-flex md3>
          <v-autocomplete
            :items="transactionTypes"
            item-value="value"
            item-text="name"
            v-model="transactionType"
            label="Transaction type"></v-autocomplete>
        </v-flex>
      </template>
      <template v-slot:beforeMenu v-else>
        <v-flex md3>
          <v-autocomplete
            :items="transactionTypes"
            item-value="value"
            item-text="name"
            v-model="transactionType"
            label="Transaction type"></v-autocomplete>
        </v-flex>
        <v-flex md1></v-flex>
      </template>
    </PaginationController>
    <BillingTransactionDetail
      v-model="transactionDetailDialog"
      v-if="transactionDetailDialog"
      :transaction="transactionInEdit"
      :isTenant="!!isTenant"/>
  </div>
</template>

<script>
import PaginationController from './PaginationController'
import BillingTransactionDetail from './BillingTransactionDetail'
import {timeTools} from '../utils/tools'

export default {
  name: 'BillingTransactionTable',
  components: {
    PaginationController,
    BillingTransactionDetail
  },
  mixins: [timeTools],
  data () {
    return {
      monthPicker: false,
      month: new Date().toISOString().substr(0, 7),
      headers: this.$store.getters.activeOrganization ? [
        { text: 'Date', value: '', align: 'left', sortable: false },
        { text: 'Type', value: '', align: 'left', sortable: false },
        { text: 'Note', value: 'note', align: 'left', width: '60%', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Balance', value: 'newBalance', align: 'left', sortable: false },
        { text: 'Action', value: 'methodForFilter', align: 'center', sortable: false, width: '8%' }
      ] : [
        { text: 'Date', value: '', align: 'left', sortable: false },
        { text: 'Type', value: '', align: 'left', sortable: false },
        { text: 'Note', value: 'note', align: 'left', width: '60%', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Balance', value: 'newBalance', align: 'left', sortable: false },
        { text: 'Operator', value: '', align: 'left', sortable: false },
        { text: 'Action', value: 'methodForFilter', align: 'center', sortable: false, width: '8%' }
      ],
      warehouseTransactions: [],
      historyLimit: 25,
      transactionDetailDialog: false,
      transactionInEdit: {},
      transactionTypes: [
        {name: '--All--', value: ''},
        {name: 'Fee', value: 'fee'}, 
        {name: 'Adjust', value: 'adjust'}, 
        {name: 'Deposit', value: 'deposit'}
      ],
      transactionType: ''
    }
  },
  watch: {

  },
  computed: {
    isTenant () {
      return this.$store.getters.activeOrganization
    },
    actionPredicates () {
      let predicates = []
      if (this.warehouseKey === 'system') {
        predicates.push({
          field: 'clientKey',
          compare: '==',
          value: this.tenantKey || this.$store.getters.activeOrganization || this.$store.getters.activeWarehouse
        })
      } else {
        this.tenantKey && predicates.push({
          field: 'tenantKey',
          compare: '==',
          value: this.tenantKey
        })
        this.warehouseKey && predicates.push({
          field: 'warehouseKey',
          compare: '==',
          value: this.warehouseKey
        })
      }

      return predicates
    }
  },
  methods: {
    showTransactionDetail (item) {
      this.transactionInEdit = item
      this.transactionDetailDialog = true
    },
    $$refresh () {
      this.$refs.tableController.$$initiateTable()
    }
  },
  props: {
    tenantKey: String,
    warehouseKey: String,
    outsideScrollToBottom: Boolean
  }
}
</script>

<style scoped>
.billing-note {
  white-space: pre-wrap; 
  overflow: auto;
  word-break: break-all;
}
</style>
