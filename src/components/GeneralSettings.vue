<template>
  <v-container fluid>
    <v-form ref="form" v-model="isValid" lazy-validation>
      <v-layout>
        <v-flex class="headline">Offer Settings</v-flex>
      </v-layout>
      <v-divider></v-divider>
      <v-container>
        <v-flex md3 lg2>
          <v-text-field
            label="Default pending period"
            v-model.number="settings.pendingPeriod"
            class="required_field"
            :rules="[fieldIsRequired('pending period'), fieldIsInteger('pending period'), fieldIsNoLessThanZero('pending period')]"
            suffix="days"></v-text-field>
        </v-flex>
        <v-flex sm3><v-checkbox label="Visible to all members" v-model="settings.isOfferPublic"></v-checkbox></v-flex>
        <v-flex md6>
          <v-autocomplete
            ref="offerEditAutocomplete"
            @change="$refs.offerEditAutocomplete['lazySearch'] = ''"
            v-model="settings.defaultUsers"
            :items="members"
            item-text="name"
            item-value="key"
            label="Default users"
            chips
            deletable-chips
            multiple
            return-object
            prepend-inner-icon="filter_list"
            :loading="$store.getters.loadingMembers"
          >
            <template v-slot:item="data">
              <template v-if="typeof data.item !== 'object'">
                <v-list-tile-content v-text="data.item"></v-list-tile-content>
              </template>
              <template v-else>
                <v-list-tile-content>
                  <v-list-tile-title>
                    <v-icon v-if="data.item.isGroup">group</v-icon>
                    <v-icon v-else>person</v-icon>
                    {{data.item.name}}
                  </v-list-tile-title>
                </v-list-tile-content>
              </template>
            </template>
          </v-autocomplete>
        </v-flex>
      </v-container>
      <v-layout>
        <v-flex class="headline">Other Settings</v-flex>
      </v-layout>
      <v-divider></v-divider>
      <v-container>
        <v-flex md3 lg2>
          <v-text-field
            label="Minimum payment amount"
            v-model.number="settings.minPaymentAmount"
            class="required_field"
            :rules="[fieldIsRequired('pending period'), fieldIsNoLessThanZero('pending period')]"
            prefix="$"></v-text-field>
        </v-flex>
        <v-flex md4 lg3>
          <v-checkbox
            label="Email notification for new comments"
            v-model="settings.recieveEmailfromComment"
            ></v-checkbox>
        </v-flex>
        <v-flex md4 lg3 v-if="settings.recieveEmailfromComment">
          <v-text-field
            label="Email address for payment request comments"
            v-model="settings.paymentRequestRecieveEmail"
          ></v-text-field>
        </v-flex>
        <v-flex md4 lg3 v-if="settings.recieveEmailfromComment">
          <v-text-field
            label="Email address for proposed offer comments"
            v-model="settings.proposeOfferRecieveEmail"
          ></v-text-field>
        </v-flex>
        <v-flex md4 lg3>
          <v-switch
            :label="settings.isMeasurementMetric ? `Metric(kg/cm)` : 'Imperial(lbs/inch)'"
            v-model="settings.isMeasurementMetric"></v-switch>
        </v-flex>
        <v-flex md4 lg3>
          <v-icon color="primary">info</v-icon> Metric system is only for input data
        </v-flex>
        <v-flex md4 lg3>
          <v-checkbox
            label="Enable Amazon Sites"
            v-model="settings.enableAmazonSites"
            ></v-checkbox>
        </v-flex>
        <v-flex md3 lg2>
          <v-btn color="primary" @click="onSubmitted">Save</v-btn>
        </v-flex>
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
      settings: {
        pendingPeriod: 0,
        minPaymentAmount: 0,
        recieveEmailfromComment: false,
        paymentRequestRecieveEmail: undefined,
        proposeOfferRecieveEmail: undefined,
        defaultUsers: [],
        isMeasurementMetric: false,
        enableAmazonSites: false
      },
      isValid: true
    }
  },
  mixins: [checkRules],
  mounted () {
    Object.keys(this.settings).forEach(key => {
      this.settings[key] = this.tenantLimitedInfo[key] === undefined ? this.settings[key] : this.tenantLimitedInfo[key]
    })
  },
  watch: {
    'settings.recieveEmailfromComment': function (value) {
      if (value) {
        this.settings.proposeOfferRecieveEmail = this.settings.proposeOfferRecieveEmail !== undefined ? this.settings.proposeOfferRecieveEmail : this.tenantEmail
        this.settings.paymentRequestRecieveEmail = this.settings.paymentRequestRecieveEmail !== undefined ? this.settings.proposeOfferRecieveEmail : this.tenantEmail
      }
    }
  },
  computed: {
    tenantLimitedInfo () {
      return this.$store.getters.tenantLimitedInfo
    },
    tenantEmail () {
      return this.$store.getters.tenant.email
    },
    members () {
      let groups = this.$store.getters.groups.map(item => { let {name, groupKey: key} = item; return {name, key, isGroup: true} })
      let members = [{ header: 'Groups' }, ...groups, { divider: true }, { header: 'Users' }]
      let activeUsers = this.$store.getters.users.filter(user => user.approvalType === 3)
      activeUsers.forEach(item => {
        let {name, uid: key} = item
        members.push({name, key, isGroup: false})
      })
      return members
    }
  },
  methods: {
    onSubmitted () {
      if (!this.$refs.form.validate()) return Promise.reject(Error('Form validate failed.'))
      return this.submitSettings()
    },
    submitSettings () {
      let payload = {...this.settings}
      if (!payload.recieveEmailfromComment) {
        delete payload.paymentRequestRecieveEmail
        delete payload.proposeOfferRecieveEmail
      }
      this.dispatchAndToast(this.$store.dispatch('changeTenantLimitedInfo', payload), 'Settings updated')
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
