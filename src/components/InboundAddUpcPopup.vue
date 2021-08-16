<template>
  <FormSubmitPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :rightMethod="onSubmitted"
    rightButtonText="Add"
    large>
    <template v-slot:input>
        <v-tabs
          color="transparent"
          v-model="tab"
          show-arrows
        >
          <v-tabs-slider color="primary"></v-tabs-slider>
          <v-tab
            v-for="tabItem in tabs"
            :key="tabItem"
            :href="`#${tabItem}`"
          >
            {{ tabItem }}
          </v-tab>
        </v-tabs>
        <v-tabs-items v-model="tab">
          <v-tab-item value="Single">
            <v-container fluid grid-list-lg v-if="tab === 'Single'">
              <v-layout align-bottom justify-start>
                <v-flex md3>
                  <v-text-field
                    :label="barcodeLabel"
                    v-model="barcode"
                  ></v-text-field>
                </v-flex>
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
                <v-flex md3 v-if="mode === 'sku'">
                  <v-autocomplete
                    :items="organizations"
                    item-text="organizationId"
                    item-value="key"
                    v-model="organizationKey"
                    label="Organization ID"
                    clearable
                    :rules="[fieldIsRequired('organization')]"
                  ></v-autocomplete>
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
            <v-container fluid v-if="hasQueryFunction && ($store.getters.env !== 'production' || $store.getters.warehouseName === 'Easygo warehouse')">
              <v-layout>
                <v-btn dark color="primary" @click="queryUpc(barcode)" :loading="isLoading" >Query UPC</v-btn>
                <v-flex v-if="queryLimit !== '-1'">{{queryLimit}} queries left today</v-flex>
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
          </v-tab-item>
          <v-tab-item value="Multiple">
            <v-textarea
              class="mt-2"
              label="Input UPC info here"
              v-model="text"
              outline></v-textarea>
          </v-tab-item>
        </v-tabs-items>
    </template>
  </FormSubmitPopup>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import { checkRules } from '@/utils/tools'
import BarcodeFinder from '../utils/barcode'

export default {
  name: 'InboundAddUpcPopup',
  components: {
    FormSubmitPopup
  },
  mixins: [checkRules],
  data () {
    return {
      mode: 'upc',
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
      tab: 'Single',
      tabs: this.hasMultiple ? ['Single', 'Multiple'] : ['Single'],
      text: ''
    }
  },
  mounted () {
    if (this.package) {
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
      this.description = (this.upcMap[this.package.upc] && this.upcMap[this.package.upc].description) || ''
      this.organizationKey = this.package.organizationKey
      this.barcode = this.package.upc
    },
    async onSubmitted () {
      if (this.tab === 'Single') {
        const {barcode, description, size, unitFee} = this
        if (this.upcMap[barcode]) {
          let upcObj = { ...this.upcMap[barcode], description, size, unitFee }
          if (!confirm('This upc exists, do you want to override this upc?')) return 'done'
          await this.$store.dispatch('updateUpc', upcObj)
        } else {
          await this.$store.dispatch('addUpc', {upc: barcode, description, size, unitFee})
        }
        return this.$emit('submitted', {upc: barcode, size})
      } 
      if (this.tab === 'Multiple') {
        const {text} = this
        await this.addUpc(text)
      } 
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
    },
    addUpc (text) {
      let errorLine = 0
      let totalAdded = 0
      let totalUpdated = 0
      let totalIgnored = 0
      let totalInvalid = 0
      let subStr = text.split(/\r?\n/)
      for (let oneLine of subStr) {
        if (!oneLine.trim()) {
          console.log('empty line')
          continue
        }
        let items = oneLine.trim().split(/\s+/)
        if (items.length > 1) {
          let upc = items[0]
          if (upc.match(/^\[.+\]$/g)) {
            upc = upc.replace(/^\[(.+)\]$/g, '$1').trim()
          } else {
            if (!BarcodeFinder.isUpcValid(upc)) {
              totalInvalid += 1
              continue
            }
          }
          
          let description = items.slice(1).join(' ')
          let obj = this.$store.getters.upcMap
          // 0 for add, 1 for update, 2 for ignore
          let flag = 0
          if (obj[upc]) {
            flag = 1 // don't allow update when intend to add
          }
          if (flag === 0) {
            this.$store.dispatch('addUpc', {upc, description})
            totalAdded += 1
          } else {
            console.log('upc ignored')
            totalIgnored += 1
          }
          // may need to increate the dispatch promise to be certain
        } else {
          errorLine += 1
        }
      }
      let errorFlag = false
      let toastStr = ''
      if (totalAdded) {
        toastStr += totalAdded + ' upcs are added! '
      }
      if (totalUpdated) {
        toastStr += totalUpdated + ' upcs are updated! '
      }
      if (totalIgnored) {
        toastStr += totalIgnored + ' upcs are ignored! '
      }
      if (totalInvalid) {
        errorFlag = true
        toastStr += totalInvalid + ' invalid upcs! '
      }
      if (errorLine) {
        errorFlag = true
        toastStr += ' line(s) constain errors! '
      }
      this.$store.dispatch('showToast', {info: toastStr, level: errorFlag ? 'error' : 'success'})
    }
  },
  props: {
    value: Boolean,
    package: Object,
    hasMultiple: Boolean
  }
}
</script>
