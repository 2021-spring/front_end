<template>
  <v-container fluid>
    <v-layout justify-start>
      <v-btn color="primary" @click.stop="showFeatureEditDialog">Edit features</v-btn>
    </v-layout>
    <v-layout justify-space-between align-baseline>
      <v-flex md2 class="success--text caption">
        <span class="realtime-border px-1">REAL TIME</span>
      </v-flex>
      <v-flex md2 v-for="num in [0, 1, 2]" :key="num">
        {{ getExpenseHeader(num) }}: ${{ totalExpense3Months[num].toLocaleString() }}
      </v-flex>
      <v-flex md2>
        <v-text-field
          label="Filter"
          v-model="filter"
          hide-details
          clearable
        ></v-text-field>
      </v-flex>
    </v-layout>
    <v-data-table
      :headers="balanceHeaders"
      :items="balances"
      class="elevation-1"
      :search="filter"
      :rows-per-page-items="rowPerPage"
      :pagination.sync="pagination">
      <template v-slot:items="{item}">
        <td class="subheading"><v-layout><strong>{{ item.clientName }}</strong></v-layout><v-layout>({{ item.email }})</v-layout></td>
        <td class="text-xs-left">{{ item.status }}</td>
        <td class="text-xs-left">${{ item.balance && item.balance.toLocaleString() }}</td>
        <td class="text-xs-left">${{ item.lowestBalance }}</td>
        <td class="text-xs-left">{{ (item.discount && item.discount.usps) || 0 }}%</td>
        <td class="text-xs-left">{{ (item.discount && item.discount.fedex) || 0 }}%</td>
        <td class="text-xs-left">{{ item.accountManager }}</td>
        <td class="text-xs-left">${{ getExpense(item.expenseHistory, 0).toLocaleString() }}</td>
        <td class="text-xs-left">${{ getExpense(item.expenseHistory, 1).toLocaleString() }}</td>
        <td class="text-xs-left">${{ getExpense(item.expenseHistory, 2).toLocaleString() }}</td>
        <td class="text-xs-left">
          <v-layout justify-center>
            <v-btn color="primary" flat @click.stop="showConfigDialog(item)">Edit</v-btn>
            <v-menu offset-y>
              <template v-slot:activator="{ on }">
                <v-btn small @click.stop="on.click" dark flat color="primary">
                  More<v-icon>expand_more</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-tile @click.stop="showAdjustDialog(item)">
                  <v-list-tile-title>Adjust</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click.stop="showExpenseHistoryDialog(item)">
                  <v-list-tile-title>History</v-list-tile-title>
                </v-list-tile>
                <v-list-tile @click.stop="showDetailDialog(item)">
                  <v-list-tile-title>Detail</v-list-tile-title>
                </v-list-tile>
              </v-list>
            </v-menu>
          </v-layout>
        </td>
      </template>
    </v-data-table>
    <FormSubmitPopup
      title="Adjust balance"
      v-model="adjustBalanceDialog"
      :rightMethod="onSubmitted"
      @popupClose="() => { adjustBalanceDialog = false }"
      medium>
      <template v-slot:input>
        <v-layout justify-space-between>
          <v-flex md3>
            <v-text-field
              label="Amount"
              prefix="$"
              class="required_field"
              v-model.number="amount"
              hint="Note: Positive value will increase balance"
              persistent-hint
              :rules="[fieldIsNumber()]"></v-text-field>
          </v-flex>
          <v-flex md3>
            <v-select
              label="Type"
              class="required_field"
              :items="[
                {text: 'Adjust balance', value: 'balance'}, 
                {text: 'Service fee', value: 'fee'}
              ]"
              item-text="text"
              item-value="value"
              v-model="type"
              :rules="[fieldIsRequired()]"></v-select>
          </v-flex>
          <v-flex md5>
            <v-text-field
              label="Keywords"
              v-model="keywords"></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-textarea
            id="balance_note"
            label="Note"
            outline
            v-model="note"></v-textarea>
        </v-layout>
      </template>
    </FormSubmitPopup>
    <ExpenseHistoryPopup
      v-if="expenseHistoryDialog"
      v-model="expenseHistoryDialog"
      :expenseHistory="expenseHistory"/>
    <FormSubmitPopup
      title="Beta features"
      v-model="featureDialog"
      v-if="featureDialog"
      medium
      @popupClose="featureDialog = false"
      :rightMethod="editFeature"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout justify-space-between>
            <v-flex>
              <v-autocomplete
                v-model="labelAndOrder"
                label="Label And Order"
                :items="clientsDisplay"
                item-text="name"
                item-value="key"
                chips
                multiple
                deletable-chips
                clearable></v-autocomplete>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <FormSubmitPopup
      title="Client config"
      v-model="configDialog"
      v-if="configDialog"
      medium
      @popupClose="configDialog = false"
      :rightMethod="editConfig"
      rightButtonText="Submit">
      <template v-slot:input>
        <v-container>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Lowest balance"
                prefix="$"
                v-model.number="clientInEdit.lowestBalance"
                :rules="[fieldIsNumber()]"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Off(USPS)"
                append-icon="%"
                v-model.number="clientInEdit.discount.usps"
                :rules="[fieldIsNumber()]"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Off(FedEx)"
                append-icon="%"
                v-model.number="clientInEdit.discount.fedex"
                :rules="[fieldIsNumber()]"></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout>
            <v-flex>
              <v-text-field
                label="Account manager"
                v-model="clientInEdit.accountManager"></v-text-field>
            </v-flex>
          </v-layout>          
          <v-layout>
            <v-flex>
              <v-autocomplete
                v-model="clientInEdit.features"
                label="Features"
                :items="Object.keys(fullBetaFeatures)"
                chips
                multiple
                deletable-chips
                clearable></v-autocomplete>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
    </FormSubmitPopup>
    <BillingDetails
      v-model="billingDetailDialog"
      v-if="billingDetailDialog"
      :tenantKey="clientInView"
      warehouseKey="system"/>
  </v-container>
</template>

<script>
import Label from './Label'
import ExpenseHistoryPopup from './ExpenseHistoryPopup'
import add from 'date-fns/add'
import BillingDetails from './BillingDetails'
import { checkRules, toMoney, splitKeyword } from '@/utils/tools'

export default {
  name: 'LabelAdmin',
  extends: Label,
  mixins: [checkRules],
  components: {
    ExpenseHistoryPopup,
    BillingDetails
  },
  data () {
    return {
      adjustBalanceDialog: false,
      selectedBalance: {},
      selectedBalanceTable: {},
      amount: 0,
      note: '',
      balanceHeaders: [
        { text: 'Name', value: 'clientName', align: 'left', sortable: true },
        { text: 'Status', value: 'status', align: 'left', sortable: true },
        { text: 'Balance', value: 'balance', align: 'left', sortable: true },
        { text: 'Lowest balance', value: 'lowestBalance', align: 'left', sortable: false },
        { text: 'Off(USPS)', value: 'email', align: 'left', sortable: false },
        { text: 'Off(FedEx)', value: 'discount', align: 'left', sortable: false },
        { text: 'Account manager', value: 'accountManager', align: 'left', sortable: false },
        { text: `${this.getExpenseHeader(0)}`, value: 'expense0', align: 'left', sortable: true },
        { text: `${this.getExpenseHeader(1)}`, value: 'expense1', align: 'left', sortable: true },
        { text: `${this.getExpenseHeader(2)}`, value: 'expense2', align: 'left', sortable: true },
        { text: 'Actions', value: '', align: 'center', sortable: false, width: '10%' }
      ],
      curKeyStr: '',
      expenseHistoryDialog: false,
      expenseHistory: [],
      featureDialog: false,
      labelAndOrder: [],
      clients: [],
      clientsDisplay: [],
      clientInEdit: {
        discount: {},
        accountManager: ''
      },
      configDialog: false,
      rowPerPage: [30, 100, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'expense0',
        descending: true
      },
      clientInView: null,
      billingDetailDialog: false,
      filter: '',
      keywords: '',
      type: 'balance'
    }
  },
  async created () {
    this.$store.dispatch('getAllSystemBalances')
    this.$store.dispatch('loadSystemInfo')
    this.clients = await this.$store.dispatch('getAllLimitedInfo')
    this.clientsDisplay = [
      {key: 'all', name: '-All-'}, 
      ...this.clients.map(client => {
        let {name, type, key} = client
        return {
          name: `${name}(${type})`,
          key
        }
      })
    ]
    const currentTime = new Date()
    this.curKeyStr = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}`
  },
  computed: {
    balanceMap () {
      return new Map(this.$store.getters.systemBalances.map(item => [item.clientKey, item]))
    },
    balances () {
      return this.clients.map(client => {
        let {name, key, email} = client
        let status = this.labelAndOrderSet.has('all') ? 'enabled' : (this.labelAndOrderSet.has(key) ? 'enabled' : 'disabled')
        let balanceStat = this.balanceMap.get(key)
        let expense0 = balanceStat && this.getExpense(balanceStat.expenseHistory, 0)
        let expense1 = balanceStat && this.getExpense(balanceStat.expenseHistory, 1)
        let expense2 = balanceStat && this.getExpense(balanceStat.expenseHistory, 2)
        if (this.balanceMap.has(key)) {
          return {...balanceStat, status, email, expense0, expense1, expense2}
        }
        return {
          balance: 0,
          clientKey: key,
          clientName: name,
          status,
          email
        }
      })
    },
    fullBetaFeatures () {
      return this.$store.getters.fullBetaFeatures
    },
    labelAndOrderSet () {
      return new Set(this.fullBetaFeatures.labelAndOrder || [])
    },
    totalExpense3Months () {
      return [0, 1, 2].map((num) => {
        return toMoney(this.balances.reduce((acc, item) => {
          return acc + this.getExpense(item.expenseHistory, num)
        }, 0))
      }) 
    }
  },
  watch: {
    balances (value) {
      this.selectedBalanceTable = value.find(item => item.clientKey === this.selectedBalanceTable.clientKey) || {}
    },
    adjustBalanceDialog () {
      this.type = 'balance'
    }
  },
  methods: {
    toMoney (num) {
      return toMoney(num)
    },
    showExpenseHistoryDialog (item) {
      this.expenseHistory = item.expenseHistory || []
      this.expenseHistoryDialog = true
    },
    onSubmitted () {
      let payload = {
        clientKey: this.selectedBalance.clientKey,
        clientName: this.selectedBalance.clientName,
        amount: this.amount,
        note: this.note,
        type: this.type,
        keywords: splitKeyword(this.keywords)
      }
      return this.$store.dispatch('adjustSystemBalance', payload)
    },
    showAdjustDialog (item) {
      this.adjustBalanceDialog = true
      this.selectedBalance = item
      this.amount = 0
      this.note = ''
    },
    showConfigDialog (item) {
      this.configDialog = true
      let {accountManager, discount = {}, lowestBalance, clientKey, clientName, status} = item
      let features = []
      Object.keys(this.fullBetaFeatures).forEach(feature => {
        let userKeySet = new Set(this.fullBetaFeatures[feature])
        if (userKeySet.has('all') || userKeySet.has(clientKey)) {
          features.push(feature)
        }
      })
      this.clientInEdit = {accountManager, discount: {...discount}, lowestBalance, clientKey, clientName, status, features}
    },
    getExpense (expenseHistory, num) {
      if (!expenseHistory) return 0
      let currentTime = add(new Date(), {months: -num})
      let curKeyStr = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}`
      let target = expenseHistory.find(item => item.dateKeyStr === curKeyStr)
      return target ? target['expense'] : 0
    },
    getExpenseHeader (num) {
      let currentTime = add(new Date(), {months: -num})
      return `${currentTime.getFullYear()}-${currentTime.getMonth() + 1} Exp`
    },
    showFeatureEditDialog () {
      this.featureDialog = true
      this.labelAndOrder = this.fullBetaFeatures.labelAndOrder
    },
    editFeature () {
      return this.$store.dispatch('editAdminFeature', this.labelAndOrder)
    },
    editConfig () {
      return this.$store.dispatch('editClientConfig', this.clientInEdit)
    },
    showDetailDialog (item) {
      this.billingDetailDialog = true
      this.clientInView = item.clientKey
    }
  }
}
</script>
