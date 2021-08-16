<template>
  <FormSubmitPopup
    title="Create audit"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Submit"
    hasAlert
    medium
  >
    <template v-slot:input>
      <v-container>
        <v-layout>
          <v-flex xs6>
            <v-autocomplete
              :items="warehousesSites"
              item-text="siteName"
              item-value="key"
              v-model="siteKey"
              :rules="[fieldIsRequired()]"
              label="Warehouse site"
            ></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-textarea
              label="Note"
              v-model="note"
              outline
            ></v-textarea>
          </v-flex>
        </v-layout>
      </v-container>
    </template>
  </FormSubmitPopup>
</template> 

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'

export default {
  name: 'WarehouseAuditCreatePopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      note: '',
      siteKey: ''
    }
  },
  computed: {
    warehousesSites () {
      return this.$store.getters.warehousesSites
    }
  },
  watch: {
    
  },
  methods: {
    async onSubmitted () {
      const audit = await this.$store.dispatch('createAudit', this.$data)
      this.$emit('onSubmitted', {
        ...audit,
        createTime: new Date()
      })
    }
  },
  props: {
    value: Boolean
  }
}
</script>
