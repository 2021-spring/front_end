<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    medium>
    <template v-slot:input>
      <v-layout justify-space-between>
        <v-flex sm4>
          <v-select
            :items="categories"
            v-model="localPaymentMethod.category"
            label="Category"
            class="required_field"
            :rules="[fieldIsRequired('category')]"
            @change="onCategoryChange"
            :disabled="editMode"
            clearable></v-select>
        </v-flex>
        <v-flex sm4>
          <v-text-field
            id="display_name"
            label="Display name"
            v-model="localPaymentMethod.displayName"></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout justify-space-around>
        <v-flex sm10>
          <v-card>
            <v-card-text>
              <PaymentBankTransferWidget
                v-model="localPaymentMethod"
                :editMode="true"
                v-if="localPaymentMethod.category === 'Bank transfer'"
              ></PaymentBankTransferWidget>
              <PaymentBillPayWidget
                v-model="localPaymentMethod"
                :editMode="true"
                v-if="localPaymentMethod.category === 'Bill pay'"></PaymentBillPayWidget>
              <PaymentCheckWidget
                v-model="localPaymentMethod"
                :editMode="true"
                v-if="localPaymentMethod.category === 'Check'"></PaymentCheckWidget>       
            </v-card-text>
          </v-card>
        </v-flex>
      </v-layout>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import PaymentBillPayWidget from './PaymentBillPayWidget'
import PaymentBankTransferWidget from './PaymentBankTransferWidget'
import PaymentCheckWidget from './PaymentCheckWidget'
import { checkRules } from '@/utils/tools'

export default {
  name: 'paymentMethodEdit',
  components: {
    FormSubmitPopup,
    PaymentBillPayWidget,
    PaymentBankTransferWidget,
    PaymentCheckWidget
  },
  mixins: [checkRules],
  data () {
    return {
      categories: ['Bill pay', 'Bank transfer', 'Check'],
      localPaymentMethod: {isValid: false}
    }
  },
  computed: {
    methodName () {
      let {creditCardCompany, bankName, accountHolder, category, cardNetwork, accountNumber, phoneNumber} = this.localPaymentMethod
      return (creditCardCompany || bankName || (category === 'Check' && 'Check')) + '-' + (cardNetwork || accountHolder) + '-' + (accountNumber || phoneNumber)
    }
  },
  mounted () {
    this.localPaymentMethod = {...this.paymentMethod, isValid: true}
  },
  methods: {
    onSubmitted () {
      !this.localPaymentMethod.displayName && (this.localPaymentMethod.displayName = this.methodName)
      let {isValid, ...paymentMethod} = this.localPaymentMethod
      let payload = {
        paymentMethod,
        index: this.paymentMethodIndex
      }
      this.$store.dispatch('addPaymentMethod', payload)
    },
    onCategoryChange () {
      // this is to clear entered data if switch to other method
      this.$nextTick(() => {
        this.localPaymentMethod = {category: this.localPaymentMethod.category, isValid: false}
      })
    }
  },
  props: {
    value: Boolean,
    title: String,
    editMode: {
      type: Boolean,
      default: false
    },
    paymentMethod: Object,
    paymentMethodIndex: Number
  }
}
</script>
