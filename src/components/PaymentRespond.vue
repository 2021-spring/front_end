<template>
  <FormSubmitPopup
    title="Payment confirm"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Confirm"
    medium>
    <template v-slot:input>
      <v-layout>
        <v-flex md2>
          <v-text-field
            id="payment_user"
            label="User"
            v-model="paymentLocal.userName"
            disabled></v-text-field>
        </v-flex>
      </v-layout>
      <br>
      <PaymentWidget v-model="paymentLocal.method" :showCategory="true" :fullDetail="true" color="black" />
      <br>
      <v-layout justify-space-between>
        <v-flex md5>
          <v-text-field
            id="balance_amount"
            label="Amount"
            prefix="$"
            v-model.number="paymentLocal.amount"
            disabled></v-text-field>
        </v-flex>
        <v-flex md5>
          <v-menu
            :close-on-content-click="false"
            v-model="endMenu"
            :nudge-right="40"
            lazy
            transition="scale-transition"
            offset-y
            full-width
            min-width="290px"
          >
            <template v-slot:activator="data">
              <v-text-field
                v-model="endDateFormatted"
                label="Estimate deliver date"
                prepend-icon="event"
                readonly
                v-on="data.on"
              ></v-text-field>
            </template>
            <v-date-picker v-model="endDateString" @input="endMenu = false"></v-date-picker>
          </v-menu>
        </v-flex>
      </v-layout>
      <UploadFileWidget
        v-model="uploadedFiles"
        type="payments"
        :maxFiles="1"
        :removeFilesUponUnmounted="!isConfirmed"></UploadFileWidget>
      <v-textarea
        id="balance_note"
        label="Note"
        outline
        v-model="note"
        rows="3"></v-textarea>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import UploadFileWidget from './UploadFileWidget'
import PaymentWidget from './PaymentWidget'
import { toDateEnd } from '../utils/tools'

export default {
  name: 'PaymentRespond',
  components: {
    FormSubmitPopup,
    UploadFileWidget,
    PaymentWidget
  },
  data () {
    return {
      note: '',
      isConfirmed: false,
      uploadedFiles: [],
      endDateString: new Date().toISOString().substr(0, 10),
      endDateFormatted: this.formatDate(new Date().toISOString().substr(0, 10)),
      endMenu: false,
      paymentLocal: {
        method: {}
      }
    }
  },
  mounted () {
    this.paymentLocal = {...this.payment}
  },
  watch: {
    endDateString (value) {
      this.endDateFormatted = this.formatDate(this.endDateString)
    }
  },
  methods: {
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed. ` + error.message})
        })
    },
    onSubmitted () {
      let {balance, ...paymentRest} = this.paymentLocal
      const payload = {
        ...paymentRest,
        note: this.note,
        isPending: true,
        files: this.uploadedFiles,
        estimateDeliverDate: this.toDateEnd(new Date(this.endDateString.replace(/-/g, '/')))
      }
      this.isConfirmed = true
      return this.dispatchAndToast(this.$store.dispatch('makePayment', payload), 'Make payment')
    },
    formatDate (date) {
      if (!date) return null

      const [year, month, day] = date.split('-')
      return `${month}/${day}/${year}`
    },
    toDateEnd (timestamp) {
      return timestamp && toDateEnd(timestamp)
    }
  },
  props: {
    value: Boolean,
    payment: Object
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
