<script>
import OnlinePaymentWidget from './OnlinePaymentWidget'
import { toMoney } from '@/utils/tools'

export default {
  name: 'LabelPaymentWidget',
  extends: OnlinePaymentWidget,
  data () {
    return {

    }
  },
  computed: {
    curWarehouseLimitedInfo () {
      return {}
    },
    stripePublicTestKey () {
      return this.$store.getters.labelStripeKey.stripePublicTestKey
    },
    stripePublicLiveKey () {
      return this.$store.getters.labelStripeKey.stripePublicLiveKey
    }
  },    
  methods: {
    submitCardPayment () {
      if (this.submitting) {
        console.log('prior payment is still processing')
        return Promise.resolve('duplicate request')
      }
      let payload = {
        paymentType: this.paymentType,
        amount: toMoney(this.amount),
        warehouseKey: this.$store.getters.activeWarehouse || '',
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
    }
  },
  props: {
    
  }
}
</script>
