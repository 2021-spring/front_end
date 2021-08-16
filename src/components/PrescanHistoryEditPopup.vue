<template>
  <FormSubmitPopup
    title="Edit"
    v-model="value"
    :rightMethod="onSubmitted"
    @popupClose="$emit('input', false)"
    medium
  >
    <template v-slot:input>
      <v-container>
        <v-layout class="headline">
          Carrier: 
        </v-layout>
        <v-layout>
          <v-radio-group
            :column="false"
            v-model="carrier">
            <v-radio
              v-for="item in Object.entries(carrierMap)"
              :key="item[0]"
              :label="`${item[1]}`"
              :value="item[0]"
            ></v-radio>
          </v-radio-group>
        </v-layout>
        <v-layout class="headline">
          Type: 
        </v-layout>
        <v-layout>
          <v-switch
            :label="isInbound ? 'Inbound' : 'Outbound'"
            v-model="isInbound"
          ></v-switch>
        </v-layout>
        <v-layout class="headline">
          Service type: 
        </v-layout>
        <v-layout>
          <v-radio-group
            :column="false"
            v-model="serviceType">
            <v-radio
              v-for="item in Object.entries(serviceTypeMap)"
              :key="item[0]"
              :label="`${item[1]}`"
              :value="item[0]"
            ></v-radio>
          </v-radio-group>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'PrescanHistoryEditPopuo',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      isInbound: true,
      carrier: 'usps',
      serviceType: 'all',
      paginationKey: ''
    }
  },
  mounted () {
    const {type, carrier, serviceType, paginationKey} = this.item
    Object.assign(this, {isInbound: type === 'inbound', carrier, serviceType, paginationKey})
  },
  methods: {
    async onSubmitted () {
      await this.$store.dispatch('updatePrescanHistory', this.$data)
      this.$emit('onSubmitted', this.$data)
    }
  },
  props: {
    value: Boolean,
    item: Object,
    carrierMap: Object,
    serviceTypeMap: Object
  }
}
</script>
