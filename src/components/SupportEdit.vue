<template>
  <FormSubmitPopup
    :title="title"
    @popupClose="$emit('input', false)"
    v-model="value"
    :rightMethod="onSubmitted"
    rightButtonText="Submit"
    medium
  >
    <template v-slot:input>
      <v-container>
        <v-layout row wrap>
          <v-flex xs12 sm6>
            <v-autocomplete
              label="Vendor"
              class="required_field"
              :items="warehouses"
              item-text="warehouseName"
              :rules="[fieldIsRequired('warehouse')]"
              return-object
              v-model="warehouse"
            ></v-autocomplete>
          </v-flex>
          <v-flex xs12 sm6>
            <v-autocomplete
              label="Category"
              class="required_field"
              :items="categories"
              item-text="displayName"
              :rules="[fieldIsRequired('category')]"
              item-value="value"
              v-model="localSupport.category"
            ></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout v-if="localSupport.category === 'Inbound'">
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Tracking"
              v-model.trim="localSupport.tracking"
              :rules="[fieldIsRequired('tracking')]"
            ></v-text-field>
          </v-flex>
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Upc"
              v-model.trim="localSupport.upc"
              :rules="[fieldIsRequired('upc')]"
            ></v-text-field>
          </v-flex>
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Quantity"
              v-model.number="localSupport.quantity"
              :rules="[
                fieldIsRequired('quantity'), 
                fieldIsInteger('quantity'), 
                fieldIsNoLessThanZero('quantity')
              ]"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout v-if="localSupport.category === 'outbound'">
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Shipment id"
              v-model.trim="localSupport.shipmentId"
              :rules="[fieldIsRequired('shipmentId')]"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout v-if="localSupport.category === 'labelClaim' || localSupport.category === 'labelChange'">
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Tracking number"
              v-model.trim="localSupport.tracking"
              :rules="[fieldIsRequired('Tracking number')]"
            ></v-text-field>
          </v-flex>
          <v-flex xs3>
            <v-text-field
              class="required_field"
              label="Label ID"
              v-model.trim="localSupport.labelId"
              :rules="[fieldIsRequired('Label ID')]"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-text-field
          label="Title"
          v-model.trim="localSupport.title"
          :rules="[fieldIsRequired('title')]"
        ></v-text-field>
        <v-textarea
          outline
          label="Question"
          v-model="localSupport.question"
          :rules="[fieldIsRequired('question')]"
          :counter="500"
          auto-grow
          rows="3"
        ></v-textarea>
        <v-flex xs12>
          <UploadFileWidget
            v-model="attachments"
            :maxFiles="3"
            type="supports"
            :removeFilesUponUnmounted="removeFilesUponUnmounted"
          />
        </v-flex>
      </v-container>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import UploadFileWidget from './UploadFileWidget'
import {checkRules} from '@/utils/tools'

export default {
  name: 'SupportEdit',
  components: {FormSubmitPopup, UploadFileWidget},
  mixins: [checkRules],
  data () {
    return {
      localSupport: {},
      warehouse: {},
      attachments: [],
      removeFilesUponUnmounted: true
    }
  },
  mounted () {
    this.localSupport = {...this.support}
    this.warehouse = {...this.initWarehouse}
  },
  computed: {
    tenant () {
      return {
        tenantKey: this.$store.getters.activeOrganization || '',
        tenantName: this.$store.getters.tenant.name || ''
      }
    },
    warehouses () { 
      return [...this.$store.getters.allPreferredWarehouses, {
        warehouseName: 'Vite USA',
        warehouseKey: 'system',
        orgId: 'system'
      }]
    },
    categories () {
      return this.warehouse.warehouseKey === 'system' ? [
        {
          displayName: 'Label change',
          value: 'labelChange'
        }, {
          displayName: 'Label claim',
          value: 'labelClaim'
        }, {
          displayName: 'Software support',
          value: 'softwareSupport'
        }
      ] : [
        {
          displayName: 'Billing',
          value: 'billing'
        }, {
          displayName: 'Inbound',
          value: 'Inbound'
        }, {
          displayName: 'Outbound',
          value: 'outbound'
        }, {
          displayName: 'Others',
          value: 'others'
        }
      ]
    }
  },
  methods: {
    onSubmitted () {
      const payload = this.$store.getters.activeOrganization ? {
        attachments: this.attachments,
        ...this.localSupport,
        ...this.warehouse,
        ...this.tenant
      } : {
        attachments: this.attachments,
        ...this.localSupport,
        tenantKey: 'system',
        tenantName: 'Vite USA',
        warehouseKey: this.$store.getters.activeWarehouse,
        warehouseName: this.$store.getters.warehouseLimitedInfo.warehouseName
      }
      this.removeFilesUponUnmounted = false
      return this.$store.dispatch('addSupport', payload)
        .catch(err => {
          console.error(err)
          this.removeFilesUponUnmounted = true
          throw err
        })
    }
  },
  props: {
    value: Boolean,
    title: {
      type: String,
      default: 'Add support case'
    },
    support: {
      type: Object,
      default: () => {
        return {}
      }
    },
    initWarehouse: {
      type: Object,
      default () {
        return {
          warehouseKey: ''
        }
      }
    }
  }
}
</script>
