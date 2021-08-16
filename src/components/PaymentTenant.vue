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
      <v-layout align-center justify-center>
        <v-flex md3 lg2 subheading>Total: <span style="color: green">${{balanceSummary.total.toLocaleString()}}</span></v-flex>
        <v-flex md3 lg2 subheading>Pending: <span style="color: green">${{balanceSummary.pending.toLocaleString()}}</span></v-flex>
        <v-flex md3 lg2 subheading>Request: <span style="color: green">${{balanceSummary.request.toLocaleString()}}</span></v-flex>
      </v-layout>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 3" :key="'item' + index">  
          <v-layout align-center justify-space-between>
            <v-flex md6 d-flex align-baseline v-if="index !== 2">
              <v-flex md5 v-if="index === 0">
                <v-btn dark color="primary" @click.stop="showAdjustBalanceDialog">Adjust balance</v-btn>
              </v-flex>
              <v-flex md5 lg3 v-if="index === 0">
                <v-select
                  v-model="paymentRequestFilter"
                  :items="paymentRequestFilterItems"
                  label="Filter"
                  item-text="name"
                  item-value="method"
                  clearable
                  ></v-select>
              </v-flex>
            </v-flex>
            <v-flex v-if="index === 0">
              <div v-if="isTenantReadGlobal" class="flash_alert flash_till_blind"><v-icon color="red">info</v-icon><span>New comment</span></div>
            </v-flex>
            <v-flex sm2 v-if="index !== 2">
              <v-text-field
                append-icon="filter_list"
                label="Search"
                single-line
                hide-details
                v-model="filter"
              ></v-text-field>
            </v-flex>
          </v-layout>
          <v-layout v-if="index === 0" justify-start align-baseline>
            <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
          </v-layout>  
          <v-data-table
            :headers="headers"
            :items="getData()"
            item-key="paymentKey"
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
              <td class="text-xs-left">{{ props.item.userName }}</td>
              <td class="text-xs-left">
                <PaymentRequestWidget
                  :comments="props.item.comments"
                  :method="props.item.method"></PaymentRequestWidget>
              </td>
              <td class="text-xs-left">${{ (balance[props.item.userKey] ? balance[props.item.userKey].total : 0).toLocaleString() }}</td>
              <td class="text-xs-left">${{ props.item.amount.toLocaleString() }}</td>
              <td class="text-xs-right">
                <v-layout row>
                  <v-flex><v-btn dark color="primary" @click.stop="showRequestRespondDialog(props.item, balance[props.item.userKey])" flat>Pay</v-btn></v-flex>
                  <v-flex>                  
                    <v-badge :value="checkNewComment(props.item)" color="red" overlap>
                      <template v-slot:badge>
                        <span class="badge">New</span>
                      </template>
                      <v-btn dark color="primary" flat @click.stop="showCommentsDialog(props.item)">Comments</v-btn>
                    </v-badge>
                  </v-flex>
                  <v-flex><v-btn dark color="secondary" flat @click.stop="cancelPaymentRequest(props.item)">Cancel</v-btn></v-flex>
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
              <td class="text-xs-left">{{ props.item && props.item.pendingEndDate && dateFormDay(props.item.pendingEndDate) }}</td>
              <td class="text-xs-left">{{ props.item.userName }}</td>
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
              <td class="text-xs-left">${{ props.item.subTotal && props.item.subTotal.toLocaleString() }}</td> 
              <td class="text-xs-left">{{ props.item.transactionType === 'inbound' ? props.item.warehouse : props.item.location }}</td>
            </template>
          </v-data-table>
          <PaginationController
            v-if="index === 2 && tab === 2"
            v-model="rawHistoryTransactions"
            :checkBox="paymentOnly"
            :select="selectedUser"
            getDataActionName="getHistoryTransactionForTenant"
            :historyLimit="historyLimit"
            :isPaymentTenant="true">
            <template v-slot:dataTable>
              <v-data-table
                :headers="headers"
                :items="getData()"
                class="elevation-2 myDense"
                hide-actions>
                <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>
                <template v-slot:items="props">
                  <td class="subheading">{{ props.index + 1 }}</td>
                  <td class="text-xs-left">{{ props.item.createTime && dateForm(props.item.createTime) }}</td>
                  <td class="text-xs-left">{{ props.item.userName }}</td>
                  <td class="text-xs-left">
                    <TransactionWidget
                      v-if="props.item.transactionType === 'payment'"
                      :isPayment="props.item.isPayment"
                      :comment="props.item.comments"
                      :method="props.item.method"
                      :note="props.item.note"
                      :estimateDeliverDate="props.item.estimateDeliverDate && `${dateFormDay(props.item.estimateDeliverDate)}`"></TransactionWidget>
                      <template v-else-if="props.item.transactionType === 'productTransfer'">
                        <v-layout>
                          <v-flex class="body-2">Product transfer - {{props.item.fromName}} => {{props.item.toName}}</v-flex>
                        </v-layout>                      
                        <v-layout>
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
              <v-flex sm8 lg6 d-flex align-baseline>
                <v-flex sm5>
                  <v-autocomplete
                    v-model="selectedUser"
                    :items="users"
                    label="Select user"
                    item-text="name"
                    item-value="uid"></v-autocomplete>
                </v-flex>
                <v-flex sm6>
                  <v-checkbox class="paymentOnly" label="Payment only" v-model="paymentOnly"></v-checkbox>
                </v-flex>
              </v-flex>
            </template>
          </PaginationController>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <AdjustBalance
      v-model="adjustBalanceDialog" 
      v-if="adjustBalanceDialog"/>
    <PaymentRespond
      v-model="requestRespondDialog"
      v-if="requestRespondDialog"
      :payment="paymentInEdit"/>
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
      :docPath="['transaction', paginationKey]"
      :comments="historyPaymentComments"
      sendWithEmail
      :chatReciever="paymentUser"
      :maxTextQty="1000"
      @add="addCommentToHistory"
      @delete="deleteCommentToHistory"/>
  </v-container>
</template>

<script>

import AdjustBalance from './AdjustBalance'
import PaymentRespond from './PaymentRespond'
import ProductWidget from './ProductWidget'
import TransactionWidget from './TransactionWidget'
import PaymentRequestWidget from './PaymentRequestWidget'
import ChatRoom from './ChatRoom'
import { toTimestampString, toDateString, isDateEqual } from '@/utils/tools'
import PaginationController from './PaginationController'
import Decimal from 'decimal.js'

export default {
  name: 'PaymentTenant',
  components: {
    AdjustBalance,
    PaymentRespond,
    ProductWidget,
    TransactionWidget,
    PaymentRequestWidget,
    PaginationController,
    ChatRoom
  },
  data () {
    return {
      tab: null,
      adjustBalanceDialog: false,
      requestRespondDialog: false,
      commentsDialog: false,
      selectedUser: '',
      paymentInEdit: {},
      headers: [
        { text: 'ID#', value: 'id', align: 'left', sortable: false },
        { text: 'Date', value: 'createTime', align: 'left', sortable: false, width: '30%' },
        { text: 'User', value: 'userName', align: 'left', sortable: false },
        { text: 'Description', value: 'comments', align: 'left', sortable: false, width: '30%' },
        { text: 'Balance', value: 'newTotalBalance', align: 'left', sortable: false },
        { text: 'Amount', value: 'amount', align: 'left', sortable: false },
        { text: 'Action', value: 'method', align: 'center', sortable: false, width: '8%' }
      ],
      tabs: ['To pay', 'Pending transaction', 'Transaction history'],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id',
        page: 1
      },
      filter: '',
      paymentOnly: false,
      historyLimit: 50,
      rawHistoryTransactions: [],
      historyCommentsDialog: false,
      paymentRequestFilter: 0,
      starIndex: 0
    }
  },
  watch: {
    tab (value) {
      // todo: clear items and load data
      this.filter = ''
      switch (value) {
        case 0:
          this.headers = [
            { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
            { text: 'Date', value: 'createTime', align: 'left', sortable: true },
            { text: 'User', value: 'userName', align: 'left', sortable: false },
            { text: 'Description', value: 'comments', align: 'left', sortable: false, width: '30%' },
            { text: 'Balance', value: 'newTotalBalance', align: 'left', sortable: false },
            { text: 'Amount', value: 'amount', align: 'left', sortable: false },
            { text: 'Action', value: 'methodForFilter', align: 'center', sortable: false, width: '8%' }
          ]
          break
        case 1:
          this.headers = [
            { text: 'ID#', value: 'price', align: 'left', sortable: false, width: '5%' },
            { text: 'Release date', value: 'pendingEndDate', align: 'left', sortable: true, width: '10%' },
            { text: 'User', value: 'userName', align: 'left', sortable: false, width: '10%' },
            { text: 'Product', value: 'productName', align: 'left', sortable: false },
            { text: 'Unit price * Qty', value: 'quantity', align: 'left', sortable: false },
            { text: 'Total', value: 'subTotal', align: 'left', sortable: false },
            { text: 'Warehouse', value: 'warehouseName', align: 'left', sortable: false, width: '20%' }
          ]
          this.$store.dispatch('getPendingTransactionForTenant')
          break
        case 2:
          this.headers = [
            { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
            { text: 'Create date', value: 'createTime', align: 'left', sortable: false, width: '10%' },
            { text: 'User', value: 'userName', align: 'left', sortable: false, width: '15%' },
            { text: 'Transaction', value: 'comments', align: 'left', sortable: false },
            { text: 'Amount', value: 'amount', align: 'left', sortable: false, width: '10%' },
            { text: 'Balance', value: 'balance', align: 'left', sortable: false, width: '10%' },
            { text: 'Action', value: 'note', align: 'center', sortable: false, width: '5%' }
          ]
          break
        default:
          break
      }
    },
    paymentRequests: {
      handler: function (value) {
        this.paymentInEdit = value.find(payment => payment.paymentKey === this.paymentInEdit.paymentKey) || {}
      },
      deep: true
    },
    paymentRequestFilter () {
      // Todo: this watch is only for reset page because of vuetify bug
      this.pagination.page = 1
    }
  },
  computed: {
    paymentRequestFilterItems () {
      return this.$store.getters.paymentRequestFilterItems
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
      return (this.paymentInEdit && this.paymentInEdit.createTime)
    },
    paginationKey () {
      return (this.paymentInEdit && this.paymentInEdit.paginationKey)
    },
    paymentLastRead () {
      return (this.paymentInEdit
        && this.paymentInEdit[`lastRead_${this.$store.getters.uid}`]) || new Date('2018-1-1')
    },
    paymentKey () {
      return (this.paymentInEdit && this.paymentInEdit.paymentKey)
    },
    paymentUser () {
      return this.paymentInEdit ? {type: 'userPayment', key: this.paymentInEdit.userKey} : {type: '', key: ''}
    },
    emailContext () {
      return {
        createTime: this.paymentInEdit.createTime,
        amount: this.paymentInEdit.amount
      } 
    },
    balance () {
      return this.$store.getters.balance
    },
    pendingTransactions () {
      return this.$store.getters.pendingTransactions.map(item => {
        if (item.transactionType === 'inbound') {
          item.subTotal = (item.price + (item.warehouse === 'self') * item.bonus) * item.quantity
          return item
        } else if (item.transactionType === 'productTransfer') {
          item.subTotal = item.items.reduce((acc, ele) => acc + ele.unitPrice * ele.toShip, 0)
          return item
        }
      })
    },
    users () {
      let allUsers = this.$store.getters.users
      return [{name: '-- All --', uid: ''}, ...allUsers]
    },
    loading () {
      return this.$store.getters.loading
    },
    isTenantReadGlobal () {
      let hasNewMessage = this.paymentRequests.some((request) => {
        return this.checkNewComment(request)
      })
      return hasNewMessage
    },
    balanceSummary () {
      let total = new Decimal(0)
      let pending = new Decimal(0)

      Object.keys(this.balance).forEach(item => {
        this.balance[item].total && (total = total.plus(this.balance[item].total))
        this.balance[item].pending && (pending = pending.plus(this.balance[item].pending))
      })

      let request = this.$store.getters.paymentRequests.reduce((sum, item) => {
        return sum.plus(item.amount)
      }, new Decimal(0))

      total = total.toDP(2).toNumber()
      pending = pending.toDP(2).toNumber()
      request = request.toDP(2).toNumber()
      return {total, pending, request}
    },
    historyTransactions () {
      return this.rawHistoryTransactions.map(item => {
        let amount = ((item.isPayment || item.transactionType === 'reportLost') === true ? (-item.amount) : item.amount) || ((item.price + (item.warehouse === 'self') * item.bonus) * item.quantity)
        let hasAfterPaymentComment = !!(item.comments && item.comments[item.comments.length - 1] && (item.comments[item.comments.length - 1].createTime >= item.createTime))
        return {...item, amount: (amount || 0), hasAfterPaymentComment}
      })
    }
  },
  methods: {
    showAdjustBalanceDialog () {
      this.adjustBalanceDialog = true
    },
    showCommentsDialog (item) {
      // get the real index in case sorted in data table
      this.paymentInEdit = item
      this.commentsDialog = true
    },
    showHistoryCommentsDialog (item) {
      this.paymentInEdit = item
      this.historyCommentsDialog = true
    },
    addCommentToHistory (comment) {
      this.paymentInEdit.comments.push(comment)
    },
    deleteCommentToHistory (comment) {
      let index = this.paymentInEdit.comments.findIndex(item => item.createTime && isDateEqual(item.createTime, comment.createTime))
      if (index !== -1) {
        this.paymentInEdit.comments.splice(index, 1)
      }      
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
      let payload = { paymentKey: item.paymentKey, starIndex: this.starIndex } 
      this.dispatchAndToast(this.$store.dispatch('setPaymentRequestStar', payload))
    },
    dateForm (timestamp) {
      return toTimestampString(timestamp)
    },
    dateFormDay (timestamp) {
      return toDateString(timestamp)
    },
    getData () {
      switch (this.tab) {
        case 0:
          return this.paymentRequests
        case 1:
          return this.pendingTransactions
        case 2:
          return this.historyTransactions
        default:
          return []
      }
    },
    dispatchAndToast (promise, actionText) {
      promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed` + error.message})
        })
    },
    showRequestRespondDialog (item, balance) {
      this.requestRespondDialog = true
      item.balance = balance
      this.paymentInEdit = item
    },
    cancelPaymentRequest (item) {
      if (confirm('Are you sure to delete this payment request?')) {
        this.dispatchAndToast(this.$store.dispatch('cancelTenantPaymentRequest', item))
      }
    },
    downloadFile (files) {
      files && files[0] && this.$store.dispatch('downloadFile', files[0])
    }
  }
}
</script>

<style>
.paymentOnly  {
  position: relative;
  top: 13px;
  left: 10px;
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
