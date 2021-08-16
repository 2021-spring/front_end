<template>
  <FormSubmitPopup
    title="Payment request"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Confirm"
    medium>
    <template v-slot:input>
      <v-container>
        <v-autocomplete
          id="payment_method"
          label="Method"
          class="required_field"
          :items="paymentMethods"
          item-text="displayName"
          :rules="[fieldIsRequired('method')]"
          return-object
          v-model="method"></v-autocomplete>
        <v-text-field
          id="balance_amount"
          :label="`Amount${minPaymentAmount ? '(minimum $' + minPaymentAmount + ')' : ''}`"
          prefix="$"
          class="required_field"
          :rules="[checkAmount, fieldIsRequired('amount'), fieldIsNoLessThanZero('amount')]"
          v-model.number="amount"
          :disabled="isEdit"></v-text-field>
        <v-autocomplete
          v-model="tenant"
          :items="companies"
          label="Select organization"
          item-text="tenantName"
          return-object
          class="required_field"
          :rules="[checkCanTenantRequest, fieldIsRequired('organization')]"
          :disabled="isEdit"></v-autocomplete>
        <v-textarea
          id="balance_comment"
          label="Comment"
          outline
          v-model="comment"
          :disabled="isEdit"></v-textarea>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { toMoney, checkRules } from '@/utils/tools'
import LoaderButton from './LoaderButton'

export default {
  name: 'PaymentRequest',
  components: {
    FormSubmitPopup,
    LoaderButton
  },
  mixins: [checkRules],
  data () {
    return {
      comment: '',
      amount: null,
      method: {},
      tenant: {},
      minPaymentAmount: 0,
      disableBtn: true
    }
  },
  created () {
    this.comment = ''
    this.amount = null
    this.method = ''
    this.minPaymentAmount = 0
    this.disableBtn = true
    if (this.selectedTenant) {
      this.getMinPaymentAmount(this.selectedTenant.tenantKey)
    }
    this.tenant = this.selectedTenant || {}

    if (this.isEdit && this.paymentRequest) {
      let {amount, comments, method, tenantKey} = this.paymentRequest
      this.amount = amount
      this.comment = comments[0] && comments[0].content
      this.method = this.paymentMethods.find(item => item.displayName === method.displayName)
      this.tenant = this.companies.find(item => item.tenantKey === tenantKey)
    }
  },
  watch: {
    tenant (value) {
      this.disableBtn = true
      this.getMinPaymentAmount(value.tenantKey)
    }
  },
  computed: {
    companies () {
      return this.$store.getters.tenantWorkFor
    },
    paymentMethods () {
      return this.$store.getters.paymentMethods
    },
    requestDisable () {
      return !this.canRequest || this.method === '' || this.amount < this.minPaymentAmount || JSON.stringify(this.tenant) === '{}' || this.disableBtn
    },
    checkCanTenantRequest () {
      let canRequest = (this.$store.getters.userExtra.blockPaymentRequest.findIndex(item => {
        return item === this.tenant.tenantKey
      }) === -1)
      return canRequest !== true ? 'You have shipments past confirm due day. Request payment is disabled。' : true
    }
  },
  methods: {
    getMinPaymentAmount (value) {
      if (value) {
        this.$store.dispatch('getTenantLimitedInfoForUser', value)
          .then(doc => {
            if (doc.exists) {
              this.minPaymentAmount = doc.data().minPaymentAmount
              !this.isEdit && (this.amount = null)
              this.disableBtn = false
            }
          })
      }
    },
    onSubmitted () {
      let payload = this.isEdit ? { method: this.method, paymentKey: this.paymentRequest.paymentKey } : {
        amount: toMoney(this.amount),
        comments: this.comment === '' ? [] : [{
          content: this.comment,
          name: this.$store.getters.userExtra.name,
          userKey: this.$store.getters.uid,
          createTime: new Date(),
          initialComment: true
        }],
        method: this.method,
        tenantKey: this.tenant.tenantKey,
        tenantName: this.tenant.tenantName
      }
      let actionName = this.isEdit ? 'updatePaymentRequest' : 'addPaymentRequest'
      return this.$store.dispatch(actionName, payload)
        .catch(error => {
          if (error.message === 'validation-failed') {
            alert(`Request amount can't exceed released amount !!!`)
          }
          console.error(error.message)
        })
    },
    checkAmount (amount) {
      return this.isEdit || (this.minPaymentAmount > amount ? 
        'Amount must be more than minimum amount' : 
        amount > this.releasedBalance ?
          'Amount must less than or equal to released balance' :
          true)
    }
  },
  props: {
    value: Boolean,
    selectedTenant: Object,
    actionText: {
      type: String,
      default: 'Pay'
    },
    isEdit: Boolean,
    paymentRequest: Object,
    releasedBalance: {
      type: Number,
      default: 0
    }
  }
}
</script>

<style>
.x-small.btn  {
  height: 25px;
  width: 25px;
  margin: 5px 4px;
}
</style>
