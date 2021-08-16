<template>
  <FormSubmitPopup
    title="Adjust balance"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    rightButtonText="Confirm"
    medium>
    <template v-slot:input>
      <v-flex md6>
        <v-autocomplete
          :items="users"
          item-text="name"
          return-object
          v-model="userSelected"
          label="User"
          :rules="userRules"
          class="required_field"
          clearable></v-autocomplete>
      </v-flex>
      <v-layout align-end justify-start>
        <v-flex md3>
          <v-text-field
            id="balance_amount"
            label="Amount"
            prefix="$"
            class="required_field"
            :rules="amountRules"
            v-model.number="amount"></v-text-field>
        </v-flex>
      </v-layout>
      <v-textarea
        id="balance_note"
        label="Note"
        outline
        v-model="note"></v-textarea>
      <v-flex>
        Balance adjustment will only appear in payment history, but not in request history. Please do not use balance adjustment to record payments.
      </v-flex>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { toMoney, checkRules } from '@/utils/tools'

export default {
  name: 'AdjustBalance',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      userSelected: null,
      note: '',
      amount: 0,
      userRules: [
        this.fieldIsRequired('user')
      ],
      amountRules: [
        this.fieldIsRequired('Amount'), this.fieldIsNumber('Amount')
      ]
    }
  },
  computed: {
    users () {
      return this.$store.getters.users
    }
  },
  methods: {
    onSubmitted () {
      let payload = {
        userKey: this.userSelected.uid,
        userName: this.userSelected.name,
        tenantKey: this.$store.getters.activeOrganization,
        tenantName: this.$store.getters.userExtra.name,
        amount: toMoney(this.amount),
        note: this.note,
        transactionType: 'payment',
        isPayment: false
      }
      return this.$store.dispatch('addAdjustBalance', payload)
    }
  },
  props: {
    value: Boolean
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
