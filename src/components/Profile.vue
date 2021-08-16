<template>
  <v-container fluid>
    <v-tabs
        color="transparent"
        v-model="tab"
        show-arrows
      >
        <v-tabs-slider color="primary"></v-tabs-slider>
        <v-tab v-for="tabItem in tabs" :key="tabItem">
          {{ tabItem }}
        </v-tab>
      <v-tabs-items v-model="tab" touchless>
        <v-tab-item v-for="(item, index) in 3" :key="'item' + index">
          <v-container fluid grid-list-lg >
            <v-layout justify-space-around="" row wrap v-if="tab === 0">
              <v-flex>
                <v-card>
                  <v-card-text>
                    <div>Name: {{userData && userData.name}}</div> 
                    <div>Email: {{userData && userData.email}}</div> 
                    <div v-if="isOrganization">Invitation code: <span id="invCode">{{$store.getters.tenant.invitationCode}}</span></div>
                    <br/>
                    <div>
                      <v-btn v-if="isOrganization" color="primary" @click.stop="generateInvitationCode" id="genCode">Generate invitation code</v-btn>
                      <v-btn v-if="!isOrganization && !isWarehouse" color="primary" @click.stop="editApplyFunc" id="joinOrg">Join an Organization</v-btn>
                      <v-btn color="secondary" @click.stop="resetPassword">Reset password</v-btn>
                    </div>
                    <br/>
                    <v-layout justify-space-between><v-flex><a @click.stop="suggestionDialog = true">Suggestion?</a></v-flex><v-spacer></v-spacer><v-flex class="text-xs-right">&copy;2018 Version: {{$store.getters.version}}</v-flex></v-layout>
                  </v-card-text>
                </v-card>
              </v-flex>
              <v-flex v-if="!isOrganization && !isWarehouse">
                <v-layout justify-start align-baseline>
                  <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
                </v-layout>
                <v-data-table
                  :headers="headers"
                  :items="tenants"
                  hide-actions
                  class="elevation-1"
                  label="Organizations"
                >
                  <template v-slot:items="props">
                    <td>{{ props.item.tenantName }}</td>
                    <td>{{ props.item.status }}</td>
                    <td class="text-xs-center">
                      <v-layout row lg3>
                        <v-flex v-if="props.item.requestID"><v-btn color="primary" flat @click.stop="cancelRequest(props.item.requestID)">Cancel</v-btn></v-flex>
                        <v-flex v-else>
                          <LoaderButton
                            flat
                            buttonText="Unsubscribe"
                            :promiseAwait="unsubscribeOrg"
                            :promiseItem="props.item"/>
                        </v-flex>
                      </v-layout>
                    </td>
                  </template>
                </v-data-table> 
              </v-flex>
            </v-layout>
          </v-container>
          <v-layout v-if="tab === 1 && index === 1 && !isOrganization && !isWarehouse" column="">
            <v-layout justify-space-between>
              <v-flex><v-btn color="primary" @click.stop="addAddressFunc" id="addSelfAddress">Add an address</v-btn></v-flex>
              <v-flex xs8 md3>
                <v-text-field
                  append-icon="filter_list"
                  label="Search"
                  single-line
                  hide-details
                  v-model="filter"
                ></v-text-field>
              </v-flex>
            </v-layout>
            <v-data-table
              :headers="headers"
              :items="sites"
              item-key="siteName"
              :search="filter"
              class="elevation-2 myDense"
              :pagination.sync="pagination">
              <template v-slot:items="props">
                <td class="text-xs-left">{{ props.item.siteName }}</td>
                <td class="text-xs-left">{{ props.item.address1 }}</td>
                <td class="text-xs-left">{{ props.item.address2 }}</td>
                <td class="text-xs-left">{{ props.item.state }}</td>
                <td class="text-xs-left">{{ props.item.city }}</td>
                <td class="text-xs-left">{{ props.item.zip }}</td>
                <td class="text-xs-center">
                  <v-layout>
                    <v-flex><v-btn dark color="primary" flat @click.stop="editAddressFunc(props.item)">Edit</v-btn></v-flex>
                    <v-flex><v-btn dark color="primary" flat @click.stop="deleteSite(props.item)">Delete</v-btn></v-flex>
                  </v-layout>
                </td>
              </template>
            </v-data-table>
          </v-layout>
          <v-layout v-if="tab === 2 && !isOrganization && !isWarehouse">
            <PaymentMethods />
          </v-layout>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
    <FormSubmitPopup
      title="Join an organization"
      v-model="editApply"
      @popupClose="editApply = false"
      :rightButtonText="`Apply`"
      :rightMethod="joinSubmitted"
      small
    >
      <template v-slot:input>
        <v-layout>
          <v-text-field
            label="Invitation code"
            single-line
            v-model="requestCode"
          ></v-text-field>
        </v-layout>
        <v-layout>
          <v-text-field
            label="Note"
            single-line
            v-model="note"
          ></v-text-field>
        </v-layout>
      </template>
    </FormSubmitPopup>
    <EditAddress
      v-model="addAddress"
      v-if="addAddress"
      :actionFunc="addressSubmitted"
      :siteNames="siteNames"></EditAddress>
    <EditAddress
      v-model="editAddress"
      v-if="editAddress"
      :address="addressInEdit"
      editMode
      :siteNames="siteNames"
      :actionFunc="editAddressSubmitted"
      :checkDistribution="() => $store.dispatch('checkUserDistribution', addressInEdit)"/>
    <SuggestionsPopup
      v-model="suggestionDialog"
      v-if="suggestionDialog"
      :actionMethod="SubmitSuggestion"
      :email="suggestion.email"
      :name="suggestion.name"
    >
      <template v-slot:inputText>
        <div>
          <v-flex>Please only submit suggestions or questions about using the system. </v-flex>
          <v-flex>If you have any question regarding packages, products or payment, please contact the other party directly.</v-flex>
          <br />Contact us by
          <br />QQ: 3372450933
          <br />
          <br />or
          <br />
          <br />
        </div>
      </template>
    </SuggestionsPopup>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import EditAddress from './EditAddress'
import PaymentMethods from './PaymentMethods'
import SuggestionsPopup from './SuggestionsPopup'
import LoaderButton from './LoaderButton'

export default {
  name: 'Profile',
  components: {
    FormSubmitPopup,
    EditAddress,
    PaymentMethods,
    SuggestionsPopup,
    LoaderButton
  },
  data () {
    return {
      tab: 0,
      editApply: false,
      editAddress: false,
      addAddress: false,
      suggestionDialog: false,
      addressInEdit: {},
      pagination: {},
      filter: '',
      suggestion: {},
      requestCode: '',
      note: ''
    }
  },
  mounted () {
    if (!this.isOrganization) {
      this.$store.dispatch('getTenantRequested')
      this.$store.dispatch('getUserSites')
    }
    this.suggestion = {
      email: this.$store.getters.userExtra.email,
      name: this.$store.getters.userExtra.name
    }
  },
  beforeDestroy () {
    if (!this.isOrganization) {
      this.$store.dispatch('clearTenantRequested')
    }
  },
  computed: {
    tabs () {
      return this.isOrganization || this.isWarehouse ? ['Basic info'] : ['Basic info', 'Self storage', 'Payment methods']
    },
    headers () {
      return this.tab === 1 ? [
        { text: 'Site name', value: 'siteName', align: 'left', sortable: false },
        { text: 'Address1', value: 'address1', align: 'left', sortable: false, width: '30%' },
        { text: 'Address2', value: 'address2', align: 'left', sortable: false },
        { text: 'State', value: 'state', align: 'left', sortable: false },
        { text: 'City', value: 'city', align: 'left', sortable: false },
        { text: 'Zip', value: 'zip', align: 'left', sortable: false },
        { text: 'Action', value: 'action', align: 'center', sortable: false, width: '10%' }
      ] : [
        { text: 'Organization', align: 'left', sortable: false, value: 'tenantName' },
        { text: 'Status', align: 'left', sortable: false, value: 'status' },
        { text: 'Action', value: 'action', align: 'center', sortable: false, width: '8%' }
      ]
    },
    userData () {
      return this.$store.getters.userExtra
    },
    tenants () {
      return this.$store.getters.tenantsForUser
    },
    sites () {
      return this.$store.getters.sites
    },
    siteNames () {
      let names = new Set(this.sites.map(item => item.siteName))
      names.delete(this.addressInEdit.siteName)
      return names
    },
    isOrganization () {
      return !!this.$store.getters.activeOrganization
    },
    isWarehouse () {
      return this.$store.getters.activeWarehouse
    }
  },
  methods: {
    joinSubmitted () {
      const {requestCode, note} = this
      return this.dispatchAndToast(this.$store.dispatch('requestJoin', {requestCode, note}), 'Join organization')
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: error.message})
          throw error
        })
    },
    addressSubmitted (payload) {
      this.dispatchAndToast(this.$store.dispatch('addNurseAddress', payload), 'Address added success.')
    },
    editAddressSubmitted (newAddress, oldAddress) {
      let payload = { newAddress, oldAddress }
      this.dispatchAndToast(this.$store.dispatch('editNurseAddress', payload), 'Address edit.')
    },
    deleteSite (index) {
      if (confirm('Are you sure to delete this site?')) {
        this.dispatchAndToast(this.$store.dispatch('deleteNurseAddress', index), 'Address delete.')
      }
    },
    cancelRequest (requestID) {
      this.$store.dispatch('cancelRequest', requestID)
    },
    editApplyFunc () {
      this.editApply = true
    },
    editAddressFunc (item) {
      this.addressInEdit = {...item}
      this.editAddress = true
    },
    addAddressFunc () {
      this.addAddress = true
    },
    resetPassword () {
      if (confirm('A reset email will be sent to your mailbox. Are your sure about this?')) {
        this.dispatchAndToast(this.$store.dispatch('sendPasswordResetEmail', this.$store.getters.userExtra.email), 'An reset email has been sent')
      }
    },
    generateInvitationCode () {
      this.$store.dispatch('generateInvitationCode')
    },
    SubmitSuggestion (payload) {
      this.$store.dispatch('sendSuggestion', payload)
    },
    unsubscribeOrg (item) {
      if (!confirm(`Are you sure to unsubscribe organization ${item.tenantName}?`)) return Promise.resolve('')
      return this.$store.dispatch('unsubscribleOrg', item)
        .catch(error => {
          console.error(error)
          this.$store.dispatch('showToast', {info: error.message})
        })
    }
  }
}
</script>
