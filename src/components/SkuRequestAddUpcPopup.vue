<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Add"
    large>
    <template v-slot:input>
      <v-container fluid grid-list-lg>
        <v-layout align-bottom justify-start>
          <v-flex md3>
            <v-text-field
              :label="barcodeLabel"
              v-model="barcode"
              readonly
              :rules="[fieldIsRequired('upc')]"
            ></v-text-field>
          </v-flex>
          <v-flex md3>
            <v-text-field
              label="Sku"
              v-model="sku"
              readonly
              :rules="[fieldIsRequired('sku')]"
            ></v-text-field>
          </v-flex>
          <v-flex md3>
            <v-autocomplete
              :items="organizations"
              item-text="organizationId"
              item-value="key"
              v-model="organizationKey"
              label="Organization ID"
              readonly
              :rules="[fieldIsRequired('organization')]"
            ></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex md3>
            <v-select
              label="Size"
              v-model="size"
              :items="upcSizes"
              item-text="name"
              item-value="sortKey"
              :rules="[fieldIsRequired('Size')]"
              class="required_field"
              ></v-select>
          </v-flex>
          <v-flex md3 v-if="size === 'custom'">
            <v-text-field
              label="Unit Fee"
              v-model.number="unitFee"
              prefix="$"></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-text-field
              label="Description"
              v-model="description"
              :rules="[fieldIsRequired('Description')]"
              class="required_field"
              autofocus
            ></v-text-field>
          </v-flex>
        </v-layout>
      </v-container>
      <v-container fluid v-if="$store.getters.env !== 'production' || $store.getters.warehouseName === 'Easygo warehouse'">
        <v-layout>
          <v-btn dark color="primary" @click="queryUpc(barcode)" :loading="isLoading" >Query UPC</v-btn>
          <v-flex v-if="queryLimit !== undefined">{{queryLimit}} queries left today</v-flex>
        </v-layout>
        <v-layout v-if="error"><v-flex>{{error}}</v-flex></v-layout>
        <v-layout>
          <div v-if="queryImage">
              <v-img :src="queryImage" :lazy-src="queryImage" width="180" contain />
          </div>
          <v-flex>
            <v-layout v-if="queryName" align-center>
              <v-flex md9><strong>Name:</strong> {{queryName}}</v-flex>
              <v-flex ml-3><v-btn dark color="primary" @click="copyUpcDescription(queryName)">Copy</v-btn></v-flex>
            </v-layout>
            <v-layout v-if="queryDetail" align-center>
              <v-flex md9><strong>Detail:</strong> {{queryDetail}}</v-flex>
              <v-flex ml-3><v-btn dark color="primary" @click="copyUpcDescription(queryDetail)">Copy</v-btn></v-flex>
            </v-layout>
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
  name: 'SkuRequestAddUpcPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      title: 'Add UPC',
      barcodeLabel: 'UPC',
      barcode: '',
      description: '', 
      size: '', 
      unitFee: 0,
      queryName: '', 
      queryDetail: '', 
      queryImage: '', 
      isLoading: false, 
      error: '',
      hasQueryFunction: true,
      organizationKey: '',
      queryLimit: undefined,
      sku: ''
    }
  },
  mounted () {
    if (this.request) {
      this.initData()
    }
  },
  computed: {
    upcMap () {
      return this.$store.getters.upcMap
    },
    organizations () {
      return this.$store.getters.warehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    upcSizes () {
      return this.$store.getters.upcSizes
    }
  },
  methods: {
    initData () {
      this.description = (this.upcMap[this.request.upc] && this.upcMap[this.request.upc].description) || this.request.note || ''
      this.organizationKey = this.request.tenantKey
      this.barcode = this.request.upc
      this.sku = this.request.sku
    },
    async onSubmitted () {
      const {barcode, description, size, unitFee} = this
      await this.$store.dispatch('addUpc', {upc: barcode, description, size, unitFee})
      return this.$store.dispatch('acceptSkuRequest', this.request)
    },
    copyUpcDescription (name) {
      this.description = name
    },
    queryUpc (upc) {
      this.queryName = ''
      this.queryDetail = ''
      this.queryImage = ''
      this.error = ''
      this.isLoading = true
      return this.$store.dispatch('getUpcDetails', {upc})
        .then(result => {
          this.queryLimit = result.remaining
          if (this.barcode === upc) {
            this.queryName = result.name
            this.queryDetail = result.detail
            this.queryImage = result.image
            !result.name && !result.detail && (this.error = 'UPC not found in database')
          } else {
            console.log('UPC definition has changed. No ops')
          }
          this.isLoading = false
        })
        .catch(() => {
          this.queryName = 'unknown'
          this.queryDetail = 'unknown'
          this.isLoading = false
        })
    }
  },
  props: {
    value: Boolean,
    request: Object
  }
}
</script>
