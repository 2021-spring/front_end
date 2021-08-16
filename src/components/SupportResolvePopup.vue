<template>
  <FormSubmitPopup
    title="Resolve case"
    @popupClose="$emit('input', false)"
    v-model="value"
    :rightMethod="onSubmitted"
    rightButtonText="Submit"
    medium
  >
    <template v-slot:input>
      <v-container>
        <v-layout row wrap align-baseline>
          <v-flex xs12 sm6>
            <v-combobox
              label="Resolution"
              multiple
              chips
              class="required_field"
              :items="types"
              v-model="resolveTypes"
              :rules="[fieldIsRequired('resolve type')]"
            ></v-combobox>
          </v-flex>
          <v-flex xs12 md6 style="position: relative; top: 5px;">
            <v-text-field
              label="Amount"
              :rules="[fieldIsRequired('Amount'), fieldIsNumber('amount')]"
              v-model.number="amount"
              class="required_field"
            ></v-text-field>
          </v-flex>
        </v-layout>
        
        <v-textarea
          outline
          label="Details"
          :counter="500"
          auto-grow
          rows="3"
          v-model="details"
        ></v-textarea>

        <v-text-field
          label="Keywords"
          v-model="keywords"></v-text-field>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import {checkRules} from '@/utils/tools'

export default {
  name: 'SupportResolvePopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      types: ['Reimburse', 'Fix data', 'No ops', 'Others'],
      details: '',
      resolveTypes: [],
      amount: 0,
      keywords: ''
    }
  },
  methods: {
    onSubmitted () {
      const {details, resolveTypes, amount, keywords} = this
      const payload = {
        resolveTypes,
        amount,
        details,
        key: this.supportKey,
        keywords
      }
      return this.$store.dispatch('resolveSupport', payload)
        .then(() => {
          this.$emit('resolved')
        })
    }
  },
  props: {
    value: Boolean,
    supportKey: String
  }
}
</script>
