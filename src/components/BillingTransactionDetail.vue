<template>
  <SimpleTextPopup
    title="Details"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    :medium="(transaction.transactionType === 'fee' && transaction.subtype !== 'other service') ||
      (['adjust', 'label'].includes(transaction.type) && !!transaction.details)"
    :small="
      transaction.transactionType === 'deposit' ||
      transaction.subtype === 'other service' ||
      transaction.type === 'deposit' 
    ">
    <template v-slot:input>
      <v-layout v-if="['inbound', 'outbound'].includes(transaction.subtype) && transaction.note !== 'custom'">
        <v-flex md2>
          <v-text-field
            label="Package fee"
            readonly
            outline
            class="thinBox"
            v-model="transaction.packageFee"
          ></v-text-field>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md2>
          <v-text-field
            label="Discount rate"
            readonly
            outline
            class="thinBox"
            :value="`${transaction.discountRate}%`"
          ></v-text-field>
        </v-flex>
        <v-flex md1></v-flex>
        <v-flex md2>
          <v-text-field
            label="Total package quantity"
            readonly
            outline
            class="thinBox"
            v-model="transaction.packageQty"
          ></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout 
        align-center
        justify-start
        v-if="transaction.otherServices && transaction.otherServices.length || transaction.warehouseNote">
        <v-flex sm3 md2 xl1>Other services: </v-flex>
        <v-flex><v-chip v-for="item in transaction.otherServices" :key="item">{{item}}</v-chip></v-flex>
      </v-layout>
      <v-data-table
        v-if="transaction.subtype === 'inbound' || transaction.subtype === 'outbound'"
        :headers="headers"
        :items="transaction.items || transaction.products"
        class="elevation-1"
      >
        <template v-slot:items="{item}">
          <td class="subheading" v-if="transaction.subtype === 'inbound'">{{ item.trackings.join(', ') }}</td>
          <td class="text-xs-left">{{ item.upc }}</td>
          <td class="text-xs-left">{{ item.quantity }}</td>
          <td class="text-xs-left">{{ item.unitFee || transaction.unitFee }}</td>
        </template>
      </v-data-table>
      <v-layout v-if="transaction.subtype === 'storage'">
        <v-flex md2>
          <v-text-field
            label="Discount rate"
            readonly
            outline
            class="thinBox"
            :value="`${transaction.discountRate}%`"
          ></v-text-field>
        </v-flex>
      </v-layout>
      <v-data-table
        v-if="transaction.subtype === 'storage'"
        :headers="headers"
        :items="transaction.upcs"
        class="elevation-1"
      >
        <template v-slot:items="{item}">
          <td class="subheading">{{ item.upc }}</td>
          <td class="text-xs-left">{{ item.unitFee }}</td>
          <td class="text-xs-left">{{ item.quantity }}</td>
          <td class="text-xs-left">{{ toMoney(item.amount, 3) }}</td>
        </template>
      </v-data-table>
      <v-container fluid v-if="transaction.transactionType === 'deposit' || transaction.type === 'deposit'">
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Deposit: </v-flex>
          <v-flex xs4>$ {{toMoney(transaction.amount)}}</v-flex>
        </v-layout>
        <v-layout v-if="transaction.bonuses && transaction.bonuses.details.length > 0">
          <v-flex xs8 md6 lg5 xl4>Bonus: </v-flex>
          <v-flex xs4>{{transaction.bonuses.details.map(item => `$ ${item.bonus}`).join(' + ')}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Transaction fee: </v-flex>
          <v-flex xs4>$ {{transaction.fee || 0}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Card number: </v-flex>
          <v-flex xs4>{{transaction.last4 && `**** ${transaction.last4}`}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Card type: </v-flex>
          <v-flex xs4>{{transaction.cardType}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Transaction time: </v-flex>
          <v-flex xs4>{{toTimestampString(transaction.createTime)}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Receipt email: </v-flex>
          <v-flex xs4>{{transaction.receiptEmail || 'Unknown'}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs8 md6 lg5 xl4>Status: </v-flex>
          <v-flex xs4>{{transaction.status || 'Success'}}</v-flex>
        </v-layout>
      </v-container>
      <v-container fluid v-if="transaction.subtype === 'other service'">
        <v-layout>
          <v-flex xs5 md4 lg3 xl2>Service fee: </v-flex>
          <v-flex>$ {{toMoney(transaction.amount)}}</v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs6 md4 lg3 xl2>Note: </v-flex>
          <v-flex xs6 md8 lg9 xl10 style="white-space: pre-wrap; overflow: auto;">{{transaction.note}}</v-flex>
        </v-layout>
      </v-container>
      <v-container fluid 
        v-if="
          allDetails.length
        ">
        <v-layout>
          <v-flex xs12 md8 lg6 xl4>
            <v-select
              :items="allDetails"
              item-text="labelKey"
              return-object
              v-model="details"
              label="Label Id"
            ></v-select>
          </v-flex>
        </v-layout>
        <template v-if="details.requestId">
          <v-layout v-if="details.trackingNumber" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Tracking number: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.trackingNumber}}</v-flex>
          </v-layout>
          <v-layout v-if="details.invoiceDate" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Invoice date: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.invoiceDate}}</v-flex>
          </v-layout>
          <v-layout v-if="details.estimatedDelivery" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Estimated delivery: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{ toDateYYYYMMDDHHmm(new Date(toLocalDateString(details.estimatedDelivery))) }}</v-flex>
          </v-layout>
          <v-layout v-if="details.invoiceNumber" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Invoice number / type: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.invoiceNumber}} / {{details.type}}</v-flex>
          </v-layout>
          <v-layout justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right justify-center>Service type: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.serviceDescription || details.actualServiceType}}</v-flex>
          </v-layout>
          <v-layout v-if="details.weight" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Weight: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.originWeight || details.weight}}{{details.isMeasurementMetric ? 'kg' : 'lbs'}}</v-flex>
          </v-layout>
          <v-layout v-if="details.actualWeight" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Actual weight: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.actualWeight}} lbs</v-flex>
          </v-layout>
          <v-layout v-if="details.billingWeight || details.invoiceWeight" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Billing weight: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.billingWeight || details.invoiceWeight}} lbs</v-flex>
          </v-layout>
          <v-layout justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Dimensions: </v-flex>
            <v-flex xs6 md6 lg5 xl3>
              {{details.actualLength || details.originLength || details.length || (details.packages && (details.packages[0].originLength || details.packages[0].length))}}{{details.isMeasurementMetric ? 'cm' : '"'}}/ 
              {{details.actualWidth || details.originWidth || details.width || (details.packages && (details.packages[0].originWidth || details.packages[0].width))}}{{details.isMeasurementMetric ? 'cm' : '"'}}/ 
              {{details.actualHeight || details.originHeight || details.height || (details.packages && (details.packages[0].originHeight || details.packages[0].height))}}{{details.isMeasurementMetric ? 'cm' : '"'}}
            </v-flex>
          </v-layout>
          <v-layout v-if="details.from || details.shipper" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Shipper: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{formatContact(details.from || details.shipper)}}</v-flex>
          </v-layout>
          <v-layout v-if="details.to || details.recipient" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Recipient: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{formatContact(details.to || details.recipient || details.originalRecipient)}}</v-flex>
          </v-layout>
          <v-layout v-if="details.zone || details.actualZone" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Zone: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.zone || details.actualZone }}</v-flex>
          </v-layout>
          <v-layout v-if="allDetails.length === 1 || details.sequenceNumber === 1" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Shipment weight: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.shipmentWeight || details.weight || (details.packages && details.packages[0].weight)}} lbs</v-flex>
          </v-layout>
          <v-layout v-if="allDetails.length === 1 || details.sequenceNumber === 1" justify-center>
            <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Shipment billing weight: </v-flex>
            <v-flex xs6 md6 lg5 xl3>{{details.shipmentBillingWeight || details.billingWeight}} lbs</v-flex>
          </v-layout>
          <template v-if="allDetails.length === 1 || details.sequenceNumber === 1">
            <v-layout justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Discounted postage amount: </v-flex>
              <v-flex xs6 md6 lg5 xl3>${{(details.amountDetails || details.actualAmountDetails || {}).postageAmount || 0}}</v-flex>
            </v-layout>
            <v-layout v-if="details.discount" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>discount: </v-flex>
              <v-flex xs6 md6 lg5 xl3>{{details.discount}}% off</v-flex>
            </v-layout>
            <v-layout :key="name" v-for="(amount, name) in detailSurcharges" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Surcharge - {{name}}: </v-flex>
              <v-flex xs6 md6 lg5 xl3>${{amount}}</v-flex>
            </v-layout>
            <v-layout v-if="details.invoiceNumber" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Total amount: </v-flex>
              <v-flex xs6 md6 lg5 xl3>${{getTotalAmount(details.actualAmountDetails, details.discount)}}</v-flex>
            </v-layout>
          </template>
          <v-layout my-2>
            <hr />
          </v-layout>
          <template v-if="details.sequenceNumber === 1">
            <v-layout v-if="details.invoiceNumber" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Difference: </v-flex>
              <v-flex xs6 md6 lg5 xl3>${{-transaction.amount}}</v-flex>
            </v-layout>
            <v-layout v-if="transaction.discount" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>VIP discount: </v-flex>
              <v-flex xs6 md6 lg5 xl3>{{transaction.discount}}%</v-flex>
            </v-layout>
            <v-layout v-if="details.orderId" justify-center>
              <v-flex pr-4 xs6 md6 lg5 xl3 text-xs-right>Total amount: </v-flex>
              <v-flex xs6 md6 lg5 xl3>${{details.totalAmount}}</v-flex>
            </v-layout>
          </template>
        </template>
      </v-container>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import {decimalTools, timeTools, addNumbers, toMoney} from '../utils/tools'

export default {
  name: 'BillingTransactionDetail',
  components: {
    SimpleTextPopup
  },
  mixins: [decimalTools, timeTools],
  data () {
    return {
      details: {}
    }
  },
  computed: {
    headers () {
      switch (this.transaction.subtype) {
        case 'storage':
          return [
            { text: 'UPC', value: 'upc', align: 'left', sortable: false },
            { text: 'Unit fee', value: 'unitFee', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Amount', value: 'amount', align: 'left', sortable: false }
          ]
        case 'inbound':
          return [        
            { text: 'Trackings', value: 'trackings', align: 'left', sortable: false },
            { text: 'UPC', value: 'upc', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Unit fee', value: 'unitFee', align: 'left', sortable: false }
          ]
        case 'outbound':
          return [
            { text: 'UPC', value: 'upc', align: 'left', sortable: false },
            { text: 'Quantity', value: 'quantity', align: 'left', sortable: false },
            { text: 'Unit fee', value: 'unitFee', align: 'left', sortable: false }
          ]
        default: 
          return []
      }
    },
    allDetails () {
      return (this.transaction.details || []).map(detail => {
        if (detail.labelKey) return detail
        return {
          labelKey: detail.requestId,
          ...detail
        }
      })
    },
    detailSurcharges () {
      const {postageAmount, ...surcharges} = (this.details.amountDetails || this.details.actualAmountDetails || {})
      return surcharges
    }
  },
  methods: {
    formatContact (contactObj) {
      const {name = '', fullName = '', company = '', address1 = '', address2 = '', city = '', state = '', zipCode = ''} = contactObj
      return `${name || fullName}, ${company},` +
        ` ${address1 + (address2 ? (', ' + address2) : '')},` +
        ` ${city}, ${state} ${zipCode}`
    },
    getTotalAmount (amountDetails, discount = 0) {
      const {postageAmount = 0} = amountDetails
      return toMoney(postageAmount * (1 - discount / 100) + this.getTotalSurcharge(amountDetails))
    },
    getTotalSurcharge (amountDetails = {}) {
      const {postageAmount, ...surcharges} = amountDetails
      return Object.values(surcharges).reduce((sum, val) => addNumbers(sum, val || 0), 0)
    }
  },
  mounted () {
    this.details = this.allDetails[0] || {}
  },
  props: {
    value: Boolean,
    transaction: Object,
    isTenant: Boolean
  }
}
</script>
