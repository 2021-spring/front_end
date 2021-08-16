<template>
  <v-container fluid>
    <v-layout>
      <v-flex class="headline">General Settings</v-flex>
    </v-layout>
    <v-divider></v-divider>
    <v-form ref="form" v-model="isValid" lazy-validation>
      <v-container>
        <v-layout>
          <v-checkbox
            label="Activate sku mode"
            v-model="generalSettings.skuMode"/>
        </v-layout>
        <v-layout>
          <v-checkbox
            label="Advanced outbound mode"
            v-model="generalSettings.advancedOutbound"/>
        </v-layout>
        <v-layout>
          <v-checkbox
            label="Activate prescan"
            v-model="generalSettings.activatePrescan"/>
        </v-layout>
        <v-layout>
          <v-flex md4 lg3>
            <v-checkbox
              label="Enable inbound SN scan"
              v-model="generalSettings.enableSnScan"
              ></v-checkbox>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex md4 lg3>
            <v-autocomplete
              :items="organizations"
              item-text="organizationId"
              item-value="key"
              v-model="generalSettings.defaultOrgId"
              label="Default organization Id"
              clearable></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex md4 lg3>
            <v-autocomplete
              :items="warehousesSites"
              item-text="siteName"
              item-value="key"
              v-model="generalSettings.defaultSite"
              label="Default Warehouse site"
              clearable></v-autocomplete>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex md4 lg3>
            <v-switch
              :label="generalSettings.isMeasurementMetric ? `Metric(kg/cm)` : 'Imperial(lbs/inch)'"
              v-model="generalSettings.isMeasurementMetric"></v-switch>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-icon color="primary">info</v-icon> Metric system is only for input data
        </v-layout>
        <v-layout>
          <v-flex md4 lg3>
            <v-checkbox
              label="Enable Amazon Sites"
              v-model="generalSettings.enableAmazonSites"
              ></v-checkbox>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex md3 lg2>
            <v-btn color="primary" @click="onSubmitted">Save</v-btn>
          </v-flex>
        </v-layout>
      </v-container>
    </v-form>
  </v-container>
</template>

<script>
import { checkRules } from '@/utils/tools'

export default {
  name: 'GeneralSettings',
  data () {
    return {
      generalSettings: {
        skuMode: false,
        advancedOutbound: false,
        activatePrescan: false,
        defaultOrgId: '',
        defaultSite: '',
        enableAmazonSites: false,
        enableSnScan: false,
        isMeasurementMetric: false
      },
      isValid: true
    }
  },
  mixins: [checkRules],
  mounted () {
    Object.keys(this.generalSettings).forEach(key => {
      if (this.warehouseInfo.generalSettings) {
        this.generalSettings[key] = this.warehouseInfo.generalSettings[key] === undefined ? this.generalSettings[key] : this.warehouseInfo.generalSettings[key]
      }
    })
  },
  computed: {
    warehouseInfo () {
      return this.$store.getters.warehouseInfo
    },
    organizations () {
      return this.$store.getters.warehouseOrganizations.filter(element => {
        return element.organizationId !== ''
      })
    },
    warehousesSites () {
      return this.$store.getters.warehousesSites
    }
  },
  methods: {
    onSubmitted () {
      if (!this.$refs.form.validate()) return Promise.reject(Error('Form validate failed.'))
      return this.submitSettings()
    },
    submitSettings () {
      let payload = {
        generalSettings: this.generalSettings
      }
      this.dispatchAndToast(this.$store.dispatch('changeWarehouseLimitedInfo', payload), 'Settings updated')
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .then(rtn => {
          this.$store.dispatch('showToast', {info: `${actionText} successfully`, level: 'success'})
        })
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed` + error.message})
        })
    }
  }
}
</script>
