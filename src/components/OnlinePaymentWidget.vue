<template>
  <FormSubmitPopup
    title="Online payment"
    v-model="value"
    :hideRgtBtn="true"
    @popupClose="$emit('input', false)"
    medium>
    <template v-slot:input>
      <v-layout align-center>
        <v-flex md6>
          <v-radio-group v-model="paymentType" row>
            <v-radio label="Credit card" value="card"></v-radio>
            <v-radio label="ACH" value="ach"></v-radio>
          </v-radio-group>
        </v-flex>
        <v-flex>
          <v-checkbox 
            v-model="isLiveChargeChecked" 
            label="Live charge"
            v-if="$store.getters.env !== 'production'" />
        </v-flex>
        <v-flex class="font-weight-bold">Vendor: {{currentWarehouse.warehouseName}}</v-flex>
      </v-layout>

      <v-layout align-end justify-start>
        <v-flex md2 xl1>
          <v-text-field
            id="balance_amount"
            label="Amount"
            prefix="$"
            class="required_field"
            :rules="amountRules"
            type="number"
            v-model.number="amount"
            :disabled="submitting"></v-text-field>
        </v-flex>
        <v-flex sm1></v-flex>
        <v-flex md6 lg5 xl4>
          <v-text-field
            id="strip-email"
            label="Receipt email"
            class="required_field"
            :rules="cardEmailRules"
            v-model="cardEmail"
            :disabled="submitting"></v-text-field>
        </v-flex>
      </v-layout>
      <!-- <v-layout v-if="paymentDetailType === 'card'" >
        <v-flex style='color: gray'>3.5% credit card transaction fee will apply</v-flex>
      </v-layout> -->
      <v-layout row wrap justify-space-around v-if="status && status.message">
        <v-flex class="xs-text-center">
          <v-alert dismissible @dismissed="onDismissed" :value="status && status.message" id="pay_status" :type="status && status.isError ? 'error' : 'success'">{{status && status.message}}</v-alert>
        </v-flex>
    </v-layout>
      <v-card>
        <v-card-text>
          <div v-if="!stripePublicLiveKey" style="color: red">Payment is currently not available, please contact warehouse.</div>
          <div v-if="paymentDetailType === 'card'" class="font-weight-bold">3% transaction fee will apply.</div>
          <v-container v-if="paymentDetailType === 'card'" class="strip strip-input card">
            <div data-locale-reversible>
              <div class="row">
                <div class="field required_field">
                  <input id="strip-address" data-tid="elements_examples.form.address_placeholder" class="input empty" v-model="cardAddress" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="address-line1">
                  <label for="strip-address" data-tid="elements_examples.form.address_label">Address</label>
                  <div class="baseline"></div>
                </div>
              </div>
              <div class="row" data-locale-reversible>
                <div class="field half-width required_field">
                  <input id="strip-city" data-tid="elements_examples.form.city_placeholder" class="input empty" v-model="cardCity" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="address-level2">
                  <label for="strip-city" data-tid="elements_examples.form.city_label">City</label>
                  <div class="baseline"></div>
                </div>
                <div class="field quarter-width required_field">
                  <input id="strip-state" data-tid="elements_examples.form.state_placeholder" class="input empty" v-model="cardState" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="address-level1">
                  <label for="strip-state" data-tid="elements_examples.form.state_label">State</label>
                  <div class="baseline"></div>
                </div>
                <div class="field quarter-width required_field">
                  <input id="strip-zip" data-tid="elements_examples.form.postal_code_placeholder" class="input empty" v-model="cardZip" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="postal-code">
                  <label for="strip-zip" data-tid="elements_examples.form.postal_code_label">ZIP</label>
                  <div class="baseline"></div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="field required_field">
                <div id="strip-card-number" ref="cardNumber" class="input empty"></div>
                <label for="strip-card-number" data-tid="elements_examples.form.card_number_label">Card number</label>
                <div class="baseline" style='color: red; font-size:10px'>{{cardNumberError}}</div>
              </div>
            </div>
            <div class="row">
              <div class="field half-width required_field">
                <input id="strip-name" data-tid="elements_examples.form.card_name_placeholder" class="input empty" v-model="cardName" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="card-name">
                <label for="strip-name" data-tid="elements_examples.form.card_name_label">Card holder name</label>
                <div class="baseline"></div>
              </div>
              <div class="field quarter-width required_field">
                <div id="strip-card-expiry" ref="cardExpiry" class="input empty"></div>
                <label for="strip-card-expiry" data-tid="elements_examples.form.card_expiry_label">Expiration</label>
                <div class="baseline" style='color: red; font-size:10px'>{{cardExpiryError}}</div>
              </div>
              <div class="field quarter-width required_field">
                <div id="strip-card-cvc" ref="cardCvc" class="input empty"></div>
                <label for="strip-card-cvc" data-tid="elements_examples.form.card_cvc_label">CVC</label>
                <div class="baseline" style='color: red; font-size:10px'>{{cardCvcError}}</div>
              </div>
            </div>

            <v-layout justify-space-around>
              <v-flex sm8>
                <v-btn color="primary" @click="submitDebounce" :disabled="!isCardReadyToSubmit || submitting || !stripePublicLiveKey">Pay</v-btn>
              </v-flex>
            </v-layout>
          </v-container>
          <div v-if="paymentDetailType === 'ach'" class="font-weight-bold">ACH is currently not supported online. If you want to deposit by ACH,  please contact your account manager</div>
          <v-container v-if="paymentDetailType === 'ach'" class="strip strip-input ach">
            <div data-locale-reversible>
              <div class="row">
                <div class="field">
                  <input id="ach-name" data-tid="elements_examples.form.ach_name_placeholder" class="input empty" v-model="achName" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="ach-name">
                  <label for="ach-name" data-tid="elements_examples.form.ach_name_label">Bank name</label>
                  <div class="baseline"></div>
                </div>
              </div>
              <div class="row" data-locale-reversible>
                <div class="field">
                  <input id="ach-routing" data-tid="elements_examples.form.ach_routing_placeholder" class="input empty" v-model="achRouting" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="ach-routing">
                  <label for="ach-routing" data-tid="elements_examples.form.ach_routing_label">Routing number</label>
                  <div class="baseline"></div>
                </div>
              </div>
              <div class="row" data-locale-reversible>
                <div class="field">
                  <input id="ach-account" data-tid="elements_examples.form.ach_account_placeholder" class="input empty" v-model="achAccount" :disabled="submitting" @focus.stop="focus" @blur.stop="blur" @keyup="keyup" type="text" required autocomplete="ach-account">
                  <label for="ach-account" data-tid="elements_examples.form.ach_account_label">Account number</label>
                  <div class="baseline"></div>
                </div>
              </div>
            </div>
          </v-container>
        </v-card-text>
      </v-card>
      <v-dialog v-model="submitting" fullscreen full-width>
        <v-container fluid fill-height style="background-color: rgba(255, 255, 255, 0.75);">
          <v-layout justify-center align-center>
            <v-progress-circular
              indeterminate
              color="primary">
            </v-progress-circular>
          </v-layout>
        </v-container>
      </v-dialog>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { toMoney, checkRules, runRules } from '@/utils/tools'

export default {
  name: 'OnlinePaymentWidget',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      amount: null,
      paymentType: 'card',
      amountRules: [
        this.fieldIsRequired('Amount')
      ],
      cardEmailRules: [
        this.fieldIsRequired('Receipt email')
      ],
      paymentDetailType: 'card',
      submitting: false,
      submitPaymentTimeout: null,
      status: {isError: false, message: ''},
      isLiveChargeChecked: false,
      stripe: null,
      stripeOptions: {
        // see https://stripe.com/docs/stripe.js#element-options for details
      },
      cardAddress: '',
      cardCity: '',
      cardState: '',
      cardZip: '',
      cardName: '',
      cardEmail: this.$store.getters.user.email,
      cardNumber: null,
      isCardNumberReady: false,
      cardNumberError: '',
      cardExpiry: null,
      isCardExpiryReady: false,
      cardExpiryError: '',
      cardCvc: null,
      isCardCvcReady: false,
      cardCvcError: '',
      achName: '',
      achRouting: '',
      achAccount: ''
    }
  },
  mounted () {
    this.attachStripeElements()
  },
  watch: {
    isLiveChargeEnabled () {
      this.detachStripeElements()
      this.attachStripeElements()
    },
    paymentType (value, oldValue) {
      if (value === 'card') {
        this.paymentDetailType = value
        // need to wait under it is mounted
        this.$nextTick(this.attachStripeElements)
      } else if (oldValue === 'card') {
        this.detachStripeElements()
        this.paymentDetailType = value
      }
    }
  },
  computed: {
    users () {
      return this.$store.getters.users
    },
    isLiveChargeEnabled () {
      return this.$store.getters.env === 'production' || this.isLiveChargeChecked
    },
    isCardReadyToSubmit () {
      return runRules(this.amountRules, this.amount) && runRules(this.cardEmailRules, this.cardEmail)
        && this.isFieldsHasValue([this.cardAddress, this.cardCity, this.cardState, this.cardZip, this.cardName])
        && this.isCardNumberReady && this.isCardExpiryReady && this.isCardCvcReady
    },
    curWarehouseLimitedInfo () {
      return this.$store.getters.warehouseLimitedInfoForTenant.find(item => item.key === this.currentWarehouse.warehouseKey) || {}
    },
    stripePublicTestKey () {
      return this.curWarehouseLimitedInfo.stripePublicTestKey || this.$store.getters.warehouseLimitedInfo.stripePublicTestKey
    },
    stripePublicLiveKey () {
      return this.curWarehouseLimitedInfo.stripePublicLiveKey || this.$store.getters.warehouseLimitedInfo.stripePublicLiveKey
    }
  },
  methods: {
    isFieldsHasValue (fields) {
      return Array.isArray(fields) ? !fields.some(item => item === '') : fields !== ''
    },
    attachStripeElements () {
      let stripePublicKey = this.isLiveChargeEnabled ? this.stripePublicLiveKey : this.stripePublicTestKey
      // Stripe is global variable import in html header
      // eslint-disable-next-line
      this.stripe = Stripe(stripePublicKey)
      let elements = this.stripe.elements()
      this.cardNumber = elements.create('cardNumber', {
        style: this.getElementStyle(),
        classes: this.getElementClasses()
      })
      this.cardNumber.addEventListener('change', (event) => {
        this.isCardNumberReady = event.complete
        this.showError('cardNumberError', event.error)
      })
      this.cardNumber.mount(this.$refs.cardNumber)

      this.cardExpiry = elements.create('cardExpiry', {
        style: this.getElementStyle(),
        classes: this.getElementClasses()
      })
      this.cardExpiry.addEventListener('change', (event) => {
        this.isCardExpiryReady = event.complete
        this.showError('cardExpiryError', event.error)
      })
      this.cardExpiry.mount(this.$refs.cardExpiry)

      this.cardCvc = elements.create('cardCvc', {
        style: this.getElementStyle(),
        classes: this.getElementClasses()
      })
      this.cardCvc.addEventListener('change', (event) => {
        this.isCardCvcReady = event.complete
        this.showError('cardCvcError', event.error)
      })
      this.cardCvc.mount(this.$refs.cardCvc)
    },
    detachStripeElements () {
      if (this.cardName) {
        this.cardNumber.unmount()
        this.cardNumber = null
        this.cardNumberError = ''
      }
      if (this.cardExpiry) {
        this.cardExpiry.unmount()
        this.cardExpiry = null
        this.cardExpiryError = ''
      }
      if (this.cardCvc) {
        this.cardCvc.unmount()
        this.cardCvc = null
        this.cardCvcError = ''
      }
      this.stripe = null
    },
    onDismissed () {
      this.setPaymentStatus('')
    },
    submitDebounce () {
      let delay = 500
      if (this.submitPaymentTimeout) {
        clearTimeout(this.submitPaymentTimeout)
        this.submitPaymentTimeout = null
      }
      this.submitPaymentTimeout = setTimeout(this.submitCardPayment, delay)
    },
    submitCardPayment () {
      if (this.submitting) {
        console.log('prior payment is still processing')
        return Promise.resolve('duplicate request')
      }
      let payload = {
        paymentType: this.paymentType,
        amount: toMoney(this.amount),
        warehouseKey: this.currentWarehouse.warehouseKey,
        user: {email: this.cardEmail},
        isLiveChargeEnabled: this.isLiveChargeEnabled
      }
      this.submitting = true
      this.setPaymentStatus('')
      return this.createToken()
        .then(result => {
          if (result.error) {
            return Promise.reject(result.error)
          } else {
            payload.stripeToken = result.token
            return this.$store.dispatch('submitPayRequest', payload)
          }
        })
        .then(payResult => {
          this.setPaymentStatus('Payment success')
          this.$emit('change', true)
        })
        .catch(error => {
          console.error('payment failed: ', error)
          let errorMessage = error.message.includes('invalid-amount') ? 'Amount should be positive number' : error.message
          this.setPaymentStatus(errorMessage, true)
          this.$emit('change', false)
        })
        .finally(() => { this.submitting = false })
    },
    setPaymentStatus (message, isError = false) {
      this.status = {
        isError, message
      }
    },
    createToken () {
      let additionalInfo = {address_line1: this.cardAddress, address_city: this.cardCity, address_state: this.cardState, address_zip: this.cardZip, name: this.cardName}
      return this.stripe.createToken(this.cardNumber, additionalInfo)
    },
    focus (event) {
      event.target.classList.add('focused')
    },
    blur (event) {
      event.target.classList.remove('focused')
    },
    keyup (event) {
      if (event.target.value.length === 0) {
        event.target.classList.add('empty')
      } else {
        event.target.classList.remove('empty')
      }
    },
    showError (element, error) {
      if (error) {
        this[element] = error.message
      } else {
        this[element] = ''
      }
    },
    getElementStyle () {
      let elementStyle = {
        base: {
          color: '#32325D',
          fontSize: '16px',

          '::placeholder': {
            color: '#CFD7DF'
          }
        },
        invalid: {
          color: '#E25950',

          '::placeholder': {
            color: '#FFCCA5'
          }
        }
      }
      return elementStyle
    },
    getElementClasses () {
      let elementClasses = {
        focus: 'focused',
        empty: 'empty',
        invalid: 'invalid'
      }
      return elementClasses
    }
  },
  props: {
    value: Boolean,
    currentWarehouse: Object
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
