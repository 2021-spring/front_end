<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 3" :key="'item' + index">
          <v-layout justify-end v-if="index === 0">
            <v-flex md10 lg8>
              <v-layout align-baseline>
                <v-flex xs3>
                  <v-autocomplete
                    v-model="selectedCompany"
                    :items="companies"
                    solo
                    label="Select organization"
                    item-text="tenantName"
                    return-object></v-autocomplete>
                </v-flex>
                <v-flex class="ml-2">Total balance: <span class="money_highlight">{{ '$' + balance.total.toLocaleString() }}</span></v-flex>
                <v-flex>Released balance: <span class="money_highlight">{{ '$' + balance.released.toLocaleString() }}</span></v-flex>
                <v-flex>Pending balance: <span class="money_highlight">{{ '$' + balance.pending.toLocaleString() }}</span></v-flex>
              </v-layout>
            </v-flex>
          </v-layout>
          <v-layout align-baseline justify-space-between v-if="index !== 2">
            <v-flex md6 d-flex>
              <v-flex md5 v-if="index === 0"><v-btn color="primary" @click.stop="showPaymentRequestDialog"><v-icon dark>add</v-icon>Request payment</v-btn></v-flex>
              <v-flex md5 lg3 v-if="index === 0">
                <v-select
                  v-model="paymentRequestFilter"
                  :items="paymentRequestFilterItems"
                  label="Filter"
                  item-text="name"
                  item-value="method"
                  ></v-select>
              </v-flex>
            </v-flex>
            <v-flex v-if="index === 0">
              <div v-if="isUserReadGlobal" class="flash_alert flash_till_blind"><v-icon color="red">info</v-icon><span>New comment</span></div>
            </v-flex>
            <v-flex sm2 v-if="index !== 2 && tab !== 2">
              <v-text-field
                append-icon="filter_list"
                label="Search"
                single-line
                hide-details
                v-model="filter"
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout v-if="index === 0 && tab === 0" align-baseline justify-start>
            <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
          </v-layout>
          <v-data-table
            :headers="headers"
            :items="getData()"
            class="elevation-2 myDense"
            :search="filter"
            :pagination.sync="pagination"
            :rows-per-page-items="rowPerPage"
            v-if="index === 0 && tab === 0">
            <template v-slot:items="props">
              <td class="subheading text-xs-right">
                {{ props.index + 1 }}
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-icon :color="checkStarred(props.item)?'yellow darken-2':'grey light-2'" v-on="on"  @click="togglePaymentRequestStar(props.item)">star</v-icon>
                  </template>
                  <span>Star only visible to yourself</span>
                </v-tooltip>
              </td>
              <td class="text-xs-left">{{ props.item.createTime && dateForm(props.item.createTime) }}</td>
              <td class="text-xs-left">{{ props.item.tenantName }}</td>
              <td class="text-xs-left">
                <PaymentRequestWidget
                  :comments="props.item.comments"
                  :method="props.item.method"></PaymentRequestWidget>
              </td>
              <td class="text-xs-left">${{ props.item.amount.toLocaleString() }}</td>
              <td class="text-xs-right">
                <v-layout row>
                  <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                    <template v-slot:badge>
                      <span class="badge">new</span>
                    </template>
                    <v-btn dark color="primary" flat @click.stop="showCommentsDialog(props.item)">Comments</v-btn>
                  </v-badge>
                  <v-btn dark color="primary" flat @click.stop="editPaymentRequestDialog(props.item)">Edit</v-btn>
                  <v-btn dark color="secondary" flat @click.stop="cancelPaymentRequest(props.item)">Cancel</v-btn>
                </v-layout>
              </td>
            </template>
          </v-data-table>
          <v-data-table
            :headers="headers"
            :items="getData()"
            class="elevation-2 myDense"
            :search="filter"
            :pagination.sync="pagination"
            :rows-per-page-items="rowPerPage"
            :loading="loading"
            v-if="index === 1 && tab === 1">
            <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>
            <template v-slot:items="props">
              <td class="subheading">{{ props.index + 1 }}</td>
              <td class="text-xs-left">{{ props.item.pendingEndDate && dateFormDay(props.item.pendingEndDate) }}</td>
              <td class="text-xs-left">{{ props.item.transactionType === 'inbound' ? props.item.tenantName : props.item.toName }}</td>
              <td class="text-xs-left">
                <ProductWidget
                  v-if="props.item.transactionType === 'inbound'"
                  :name="props.item.productName"
                  :condition="props.item.productCondition"></ProductWidget>
                <v-layout
                  v-else
                  v-for="(item, index) in props.item.items" 
                  :key="'item' + index">
                  <ProductWidget
                    :name="item.name"
                    :condition="item.condition"
                    :upc="item.upc"
                    :asin="item.asin"
                  ></ProductWidget>
                </v-layout> 
              </td>
              <td class="text-xs-left" v-if="props.item.transactionType === 'inbound'">{{ `$${props.item.price + (props.item.warehouse === 'self') * props.item.bonus} * ${props.item.quantity}` }}</td> 
              <td class="text-xs-left" v-else>
                <v-layout column justify-space-between fill-height>
                  <v-flex
                    v-for="(item, index) in props.item.items" 
                    :key="'quantity' + index">${{ item.unitPrice }} * {{ item.toShip }}</v-flex>
                </v-layout>
              </td>
              <td class="text-xs-left">${{ props.item.subTotal.toLocaleString() }}</td> 
              <td class="text-xs-left">{{ props.item.transactionType === 'inbound' ? props.item.warehouse : props.item.location }}</td>
            </template>
          </v-data-table>
          <PaginationController
            v-if="index === 2 && tab === 2"
            v-model="rawHistoryTransactions"
            :checkBox="paymentOnly"
            getDataActionName="getHistoryTransactionForUser"
            :historyLimit="historyLimit">
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="getData()"
                class="elevation-2 myDense"
                :search="filter"
                hide-actions>
                <template v-slot:items="props">
                  <td class="subheading">{{ props.index + 1 }}</td>
                  <td class="text-xs-left">{{ props.item.createTime && dateForm(props.item.createTime) }}</td>
                  <td class="text-xs-left">{{ props.item.tenantName }}</td>
                  <td class="text-xs-left">
                    <TransactionWidget
                      v-if="props.item.transactionType === 'payment'"
                      :isPayment="props.item.isPayment"
                      :comment="props.item.comments"
                      :method="props.item.method"
                      :note="props.item.note"
                      :estimateDeliverDate="props.item.estimateDeliverDate && `${dateFormDay(props.item.estimateDeliverDate)}`"></TransactionWidget>
                    <template v-else-if="props.item.transactionType === 'productTransfer'">
                      <v-layout >
                        <v-flex class="body-2">Product transfer - {{props.item.fromName}} => {{props.item.toName}}</v-flex>
                      </v-layout>                      
                      <v-layout >
                        <v-flex>Transaction id: {{props.item.transactionId}}</v-flex>
                      </v-layout>
                    </template>
                    <div v-else>
                      <v-layout>
                        <v-flex class="body-2"> {{props.item.transactionType === 'reportLost' ? 'Report lost' : 'Inbound'}} - {{ props.item.productName }}</v-flex>
                      </v-layout>
                      <v-layout>
                        <v-flex class="body-2"> {{props.item.transactionType === 'reportLost' ? `$${props.item.price} * ${props.item.quantity}` : `$${props.item.price + (props.item.warehouse === 'self' ? props.item.bonus : 0)} * ${props.item.quantity}`}}</v-flex>
                      </v-layout>
                    </div>
                  </td>
                  <td :class="props.item.amount > 0 ? 'text-xs-left fontRed' : 'text-xs-left fontGreen'">${{ props.item.amount.toLocaleString() }}</td>
                  <td class="text-xs-left">${{ props.item.newTotalBalance.toLocaleString() }}</td>
                  <td class="text-xs-center">
                    <v-layout>
                      <v-flex v-if="props.item.files"><v-btn color="primary" flat @click.stop="downloadFile(props.item.files)" :disabled="!props.item.files.length">Attachment</v-btn></v-flex>
                      <v-flex v-if="props.item.transactionType === 'payment' && props.item.isPayment === true"><v-btn :color="props.item.hasAfterPaymentComment ? 'green' : 'primary'" flat @click.stop="showHistoryCommentsDialog(props.item)">Comments</v-btn></v-flex>
                    </v-layout>
                  </td>
                </template>
              </v-data-table>
            </template>
            <template v-slot:beforeMenu>
              <v-flex md5 v-if="index === 2">
                <v-checkbox class="paymentOnly" label="Payment only" v-model="paymentOnly"></v-checkbox>
              </v-flex>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <PaymentRequest
      v-model="paymentDialog"
      v-if="paymentDialog"
      :selectedTenant="selectedCompany"
      :actionText="isEditPayment ? 'Update' : 'Request'"
      :isEdit="isEditPayment"
      :releasedBalance="balance.released"
      :paymentRequest="paymentRequestInEdit"></PaymentRequest>
    <ChatRoom
      v-model="commentsDialog"
      v-if="commentsDialog"
      :lastReadTime="paymentLastRead"
      :docPath="['paymentRequest', paymentKey]"
      sendWithEmail
      :emailContext="emailContext"
      :chatReciever="paymentUser"
      :comments="paymentComments"
      :maxTextQty="1000"/>
    <ChatRoom
      v-model="historyCommentsDialog"
      v-if="historyCommentsDialog"
      :createTime="historyPaymentCreateTime"
      readOnly
      :docPath="['transaction', paginationKey]"
      :comments="historyPaymentComments"/>
  </v-container>
</template>

<script>
import PaymentRequest from './PaymentRequest'
import PaymentRequestWidget from './PaymentRequestWidget'
import { toTimestampString, toDateString } from '@/utils/tools'
import ProductWidget from './ProductWidget'
import TransactionWidget from './TransactionWidget'
import ChatRoom from './ChatRoom'
import PaginationController from './PaginationController'
import Decimal from 'decimal.js'

export default {
  name: 'PaymentUser',
  components: {
    PaymentRequest,
    PaymentRequestWidget,
    ProductWidget,
    TransactionWidget,
    ChatRoom,
    PaginationController
  },
  data () {
    return {
      tab: null,
      paymentDialog: false,
      headers: [
        { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
        { text: 'Date', value: 'date', align: 'left', sortable: false },
        { text: 'Organization', value: 'tenantName', align: 'left', sortable: false },
        { text: 'Payment request', value: 'payment', align: 'left', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Action', value: 'action', align: 'center', sortable: false, width: '8%' }
      ],
      tabs: [
        'Payment requests', 'Pending transactions', 'Transaction history'
      ],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      filter: '',
      selectedCompany: {},
      paymentOnly: false,
      commentsDialog: false,
      historyCommentsDialog: false,
      paymentInEdit: {},
      historyLimit: 50,
      rawHistoryTransactions: [],
      isEditPayment: false,
      paymentRequestInEdit: null,
      paymentRequestFilter: 0,
      starIndex: 1
    }
  },
  mounted () {
    this.$store.dispatch('resetBalance')
    this.companies && this.companies.length > 0 && (this.selectedCompany = this.companies[0])
  },
  watch: {
    tab (value) {
      this.filter = ''
      // todo: clear items and load data
      switch (value) {
        case 0:
          this.headers = [
            { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
            { text: 'Date', value: 'createTime', align: 'left', sortable: false },
            { text: 'Organization', value: 'tenantName', align: 'left', sortable: false },
            { text: 'Payment request', value: 'comments', align: 'left', sortable: false },
            { text: 'Amount', value: 'amount', align: 'left', sortable: false },
            { text: 'Action', value: 'methodForFilter', align: 'center', sortable: false, width: '8%' }
          ]
          break
        case 1:
          this.headers = [
            { text: 'ID#', value: 'price', align: 'left', sortable: false, width: '5%' },
            { text: 'Release date', value: 'pendingEndDate', align: 'left', sortable: true, width: '10%' },
            { text: 'Organization', value: 'tenantName', align: 'left', sortable: false, width: '10%' },
            { text: 'Product', value: 'productName', align: 'left', sortable: false },
            { text: 'Unit price * Qty', value: 'quantity', align: 'left', sortable: false },
            { text: 'Total', value: 'subTotal', align: 'left', sortable: false },
            { text: 'Warehouse', value: 'warehouseName', align: 'left', sortable: false, width: '20%' }
          ]
          this.$store.dispatch('getPendingTransactionForUser')
          break
        case 2:
          this.headers = [
            { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
            { text: 'Date', value: 'createTime', align: 'left', sortable: false, width: '15%' },
            { text: 'Organization', value: 'tenantName', align: 'left', sortable: false, width: '10%' },
            { text: 'Transaction', value: 'comments', align: 'left', sortable: false },
            { text: 'Amount', value: 'amount', align: 'left', sortable: false, width: '10%' },
            { text: 'Balance', value: 'newTotalBalance', align: 'left', sortable: false, width: '10%' },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '5%' }
          ]
          break
        default:
          break
      }
    },
    selectedCompany (value) {
      this.$store.dispatch('getBalanceForUser', value.tenantKey)
    },
    paymentRequests: {
      handler: function (value) {
        this.paymentInEdit = value.find(payment => payment.paymentKey === this.paymentInEdit.paymentKey) || {}
      },
      deep: true
    }
  },
  computed: {
    companies () {
      return this.$store.getters.tenantWorkFor
    },
    paymentRequestFilterItems () {
      return this.$store.getters.paymentRequestFilterItems
    },
    balance () {
      let {total, released, pending} = this.$store.getters.balanceForUser
      return {
        total: new Decimal(total).toDP(2).toNumber(),
        released: new Decimal(released).toDP(2).toNumber(),
        pending: new Decimal(pending).toDP(2).toNumber()
      }
    },
    paymentRequests () {
      let paymentRequests = this.$store.getters.paymentRequests.map(request => {
        request.methodForFilter = Object.values(request.method).join(' ')
        return request
      })

      switch (this.paymentRequestFilter) {
        case 1:
          return paymentRequests.filter(request => this.checkNewComment(request))
        case 2:
          return paymentRequests.filter(request => this.checkStarred(request))
        default:
          return paymentRequests
      }
    },
    paymentComments () {
      return (this.paymentInEdit && this.paymentInEdit.comments) || []
    },
    paymentCommentsCreateTime () {
      return (this.paymentInEdit && this.paymentInEdit.createTime)
    },
    historyPaymentComments () {
      return (this.paymentInEdit && this.paymentInEdit.comments) || []
    },
    historyPaymentCreateTime () {
      return (this.paymentInEdit && this.paymentInEdit.createTime) || []
    },
    paymentLastRead () {
      return (this.paymentInEdit
        && this.paymentInEdit[`lastRead_${this.$store.getters.uid}`]
        && this.paymentInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    paymentKey () {
      return (this.paymentInEdit && this.paymentInEdit.paymentKey)
    },
    paymentUser () {
      return this.paymentInEdit ? {type: 'tenantPayment', key: this.paymentInEdit.tenantKey} : {type: '', key: ''}
    },
    emailContext () {
      return {
        createTime: this.paymentInEdit.createTime,
        amount: this.paymentInEdit.amount
      } 
    },
    paginationKey () {
      return (this.paymentInEdit && this.paymentInEdit.paginationKey)
    },
    pendingTransactions () {
      return this.$store.getters.pendingTransactions.map(item => {
        if (item.transactionType === 'inbound') {
          item.subTotal = (item.price + (item.warehouse === 'self') * item.bonus) * item.quantity
          return item
        } else if (item.transactionType === 'productTransfer') {
          item.subTotal = item.items ? item.items.reduce((acc, ele) => acc + ele.unitPrice * ele.toShip, 0) : 0
          return item
        }
      })
    },
    isUserReadGlobal () {
      let hasNewMessage = this.paymentRequests.some((request) => {
        return this.checkNewComment(request)
      })
      return hasNewMessage
    },
    historyTransactions () {
      return this.rawHistoryTransactions.map(item => {
        let amount = ((item.isPayment || item.transactionType === 'reportLost') === true ? (-item.amount) : item.amount) || ((item.price + (item.warehouse === 'self') * item.bonus) * item.quantity)
        let hasAfterPaymentComment = !!(item.comments && item.comments[item.comments.length - 1] && (item.comments[item.comments.length - 1].createTime >= item.createTime))
        return {...item, amount: amount || 0, hasAfterPaymentComment}
      })
    },
    loading () {
      return this.$store.getters.loading
    }
  },
  methods: {
    showPaymentRequestDialog () {
      this.isEditPayment = false
      this.paymentRequestInEdit = null
      this.paymentDialog = true
    },
    editPaymentRequestDialog (item) {
      this.isEditPayment = true
      this.paymentRequestInEdit = item
      this.paymentDialog = true
    },
    showCommentsDialog (item) {
      this.paymentInEdit = item
      this.commentsDialog = true
    },
    showHistoryCommentsDialog (item) {
      this.paymentInEdit = item
      this.historyCommentsDialog = true
    },
    checkNewComment (request) {
      let lastReadTime = request[`lastRead_${this.$store.getters.uid}`]
      let hasOnlyInitialComment = request.comments && request.comments.length === 1 && request.comments[0].initialComment
      let lastMessageTime = request.comments && request.comments.length > 0 && request.comments.slice(-1)[0].createTime

      return !hasOnlyInitialComment && !!lastMessageTime && (!lastReadTime || lastReadTime < lastMessageTime)
    },
    checkStarred (request) {
      return ('starStatus' in request) &&
        (request.starStatus instanceof Array) &&
        request.starStatus[this.starIndex] === true
    },
    togglePaymentRequestStar (item) {
      // how to update one doc 
      let payload = { paymentKey: item.paymentKey, starIndex: this.starIndex } 
      this.dispatchAndToast(this.$store.dispatch('setPaymentRequestStar', payload))
    },
    getData () {
      switch (this.tab) {
        case 0:
          return this.paymentRequests
        case 1:
          return this.pendingTransactions
        case 2:
          return this.historyTransactions.filter(item => {
            if (this.paymentOnly) {
              return item.transactionType === 'payment'
            } else {
              return item
            }
          })
        default:
          return []
      }
    },
    dateForm (timestamp) {
      return toTimestampString(timestamp)
    },
    dateFormDay (timestamp) {
      return toDateString(timestamp)
    },
    dispatchAndToast (promise, actionText) {
      promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed` + error.message})
        })
    },
    cancelPaymentRequest (item) {
      if (confirm('You can change payment method by editing payment. Cancelling pamyent will lose the spot in payment request queue. Are you sure to delete this payment request?')) {
        this.dispatchAndToast(this.$store.dispatch('cancelUserPaymentRequest', item))
      }
    },
    downloadFile (files) {
      files && files[0] && this.$store.dispatch('downloadFile', files[0])
    }
  }
}
</script>

<style>
.selectCompany  {
  background: yellowgreen;
  border: 1px gray solid;
  margin-left: 5px;
}

.money_highlight {
  color: green;
  font-weight: bold;
}

.fontRed {
  color: red;
}

.fontGreen {
  color: green;
}

.badge {
  font-size: 10px;
}

.flash_till_blind {
  animation: blink 1s infinite;
  -webkit-animation: blink 1s infinite;
}

.flash_alert{
  background-color: inherit !important;
  color: red;
  border: 0px;
}

.subheading {
  white-space: nowrap;
}

@keyframes blink {
0%{opacity: 0;}
50%{opacity: 100;}
100%{opacity: 0;}
}
@-webkit-keyframes blink {
0% {opacity: 0;}
50% {opacity: 100;}
100% {opacity: 0;}
}
</style>
