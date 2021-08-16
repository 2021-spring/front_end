<template>
  <v-container fluid>
    <v-layout justify-space-between>
      <v-layout justify-space-between>
        <v-flex sm6 md3 v-if="!$store.getters.activeOrganization">
          <v-select
            :items="tenants"
            label="Select organization"
            item-text="tenantName"
            return-object
            v-model="tenantSelected"></v-select>
        </v-flex>
        <v-flex md7 v-if="$store.getters.activeOrganization">
          <v-select
            :items="warehouses"
            label="Select warehouse"
            item-text="warehouseName"
            return-object
            v-model="warehouseSelected"></v-select>
        </v-flex>
        <v-flex md4 v-if="$store.getters.activeOrganization && selectedWarehouseLimitedInfo.key">
          <v-btn color="primary" @click="() => showRatesDialog = true">Rates</v-btn>
        </v-flex>
      </v-layout>
      <v-layout justify-end v-if="$store.getters.activeOrganization">
        <v-btn dark color="primary" @click.stop="showSignupWarehouseDialog"><v-icon dark>add</v-icon>Signup preferred warehouse</v-btn>
        <v-btn dark color="primary" @click.stop="showAddSiteDialog"><v-icon dark>add</v-icon>Add other warehouse</v-btn>
      </v-layout>
    </v-layout>
    <v-layout>
      <v-flex>
        <v-data-table
          :headers="headers"
          :items="selectedWarehouseSites"
          class="elevation-2 myDense"
          :pagination.sync="pagination">
          <template v-slot:items="props">
            <td class="text-xs-left">{{ props.item.siteName }}</td>
            <td class="text-xs-left" v-if="!(warehouseSelected && $store.getters.activeOrganization && $store.getters.activeOrganization === warehouseSelected.warehouseKey)">{{ props.item.orgId }}</td>
            <td class="text-xs-left">{{ props.item.address1 }}</td>
            <td class="text-xs-left">{{ props.item.address2 }}</td>
            <td class="text-xs-left">{{ props.item.state }}</td>
            <td class="text-xs-left">{{ props.item.city }}</td>
            <td class="text-xs-left">{{ props.item.zip }}</td>
            <td class="text-xs-left">{{ props.item.phone }}</td>
            <td class="text-xs-center" v-if="warehouseSelected && warehouseSelected.warehouseKey && warehouseSelected.warehouseKey === $store.getters.activeOrganization">
              <v-layout>
                <v-flex><v-btn dark color="primary" flat @click.stop="showEditSiteDialog(props.item)">Edit</v-btn></v-flex>
                <v-flex><v-btn dark color="primary" flat @click.stop="deleteSite(props.item)">Delete</v-btn></v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
    <EditAddress
      v-model="addAddress"
      v-if="addAddress"
      :actionFunc="addAddressSubmitted"
      isWarehouse
      :siteNames="siteNames"/>
    <EditAddress
      v-model="editAddress"
      v-if="editAddress"
      :address="addressInEdit"
      editMode
      isWarehouse
      :actionFunc="editAddressSubmitted"
      :siteNames="siteNames"
      :checkDistribution="() => $store.dispatch('checkTenantDistribution', addressInEdit)"/>
    <FormSubmitPopup
      title="Signup warehouse service"
      v-if="signupWarehouseDialog"
      v-model="signupWarehouseDialog"
      @popupClose="signupWarehouseDialog = false"
      :rightButtonDisabled="rightButtonDisabled"
      :rightMethod="type === 'listed' ? signupWarehouse : signupWarehouseWithName"
      rightButtonText="Submit"
      hasAlert
      small>
      <template v-slot:input>
        <v-radio-group
          :column="false"
          v-model="type">
          <v-radio
            label="Direct"
            value="direct"
          ></v-radio>
          <v-radio
            label="Listed warehouse"
            value="listed"
          ></v-radio>
        </v-radio-group>
        <v-layout>
          <v-flex xs8>          
            <v-text-field
              autofocus
              v-if="type === 'direct'"
              v-model="warehouseName"
              label="Warehouse name"
            ></v-text-field>
            <v-select
              v-else
              :items="warehousesForSignup"
              v-model="selectedWarehouseProvider"
              item-text="warehouseName"
              return-object
              label="Select a preferred provider"
              :rules="[fieldIsRequired('warehouse')]"
              class="required_field"></v-select>
          </v-flex>
        </v-layout>
        <v-layout column v-if="type === 'listed' && requestStatusForTheSelection">
          <v-flex sm10 style="margin-left: 16px">
            Signup request has been sent to this warehouse provider. When the request is approved, you will be assigned with a new organization ID and will see the warehouse in the warehouse sites dropdown. 
          </v-flex>
        </v-layout>
        <v-layout column v-else-if="type === 'listed' && warehousesObj[selectedWarehouseProvider.warehouseKey]">
          <v-flex sm10 style="margin-left: 16px">
            This warehouse provider has approved your request.
          </v-flex>
        </v-layout>
        <v-layout column v-else-if="type === 'listed'">
          <v-flex sm10 style="margin-left: 16px">
            This warehouse provider is open to signup
          </v-flex>
        </v-layout>
        <template v-if="signupRequests && signupRequests.length > 0">
          <v-divider class="mt-4"></v-divider>
          <v-layout class="mt-2">
            Request status:
          </v-layout>
          <v-layout v-for="item in signupRequests" :key="item.warehouseName">
            - {{item.warehouseName}}: pending
          </v-layout>
        </template>
      </template>
    </FormSubmitPopup>
    <WarehouseRatesPopup
      v-model="showRatesDialog"
      v-if="showRatesDialog"
      :selectedWarehouseLimitedInfo="selectedWarehouseLimitedInfo"/>
  </v-container>
</template>

<script>
import FormSubmitPopup from './FormSubmitPopup'
import LoaderButton from './LoaderButton'
import EditAddress from './EditAddress'
import { setTimeout } from 'timers'
import { checkRules, timeTools } from '@/utils/tools'
import WarehouseRatesPopup from './WarehouseRatesPopup'

export default {
  name: 'WarehouseSite',
  components: {
    EditAddress,
    FormSubmitPopup,
    LoaderButton,
    WarehouseRatesPopup
  },
  mixins: [checkRules, timeTools],
  data () {
    return {
      pagination: {},
      editAddress: false,
      addAddress: false,
      signupWarehouseDialog: false,
      addressInEdit: {},
      sites: [],
      addSite: false,
      tenantSelected: {},
      warehouseSelected: {},
      selectedWarehouseProvider: {},
      tenantKey: '',
      textError: false,
      warehousesForSignup: [],
      warehousesNotForSignup: [],
      signupRequests: [],
      type: 'direct',
      warehouseName: '',
      showRatesDialog: false
    }
  },
  mounted () {
    if (this.$store.getters.activeOrganization) {
      this.tenantSelected = {
        tenantKey: this.$store.getters.activeOrganization,
        tenantName: this.$store.getters.tenant.name
      }
      setTimeout(() => {
        this.warehouseSelected = this.warehouses[0]
      }, 300)
      this.getAllWarehouses()
    } else {
      setTimeout(() => {
        this.tenantSelected = this.tenants[0]
      }, 300)
    }
  },
  watch: {
    tenantSelected (value) {
      if (value) {
        this.$store.dispatch('getWarehousesForTenant', value.tenantKey)
      }
    },
    signupWarehouseDialog (value) {
      if (value) {
        this.warehouseName = ''
        this.type = 'direct'
        this.$store.dispatch('loadSignupWarehouseRequestsForTenant')
          .then((signupRequests) => {
            this.signupRequests = signupRequests
          })
      }
    }
  },
  computed: {
    rightButtonDisabled () {
      if (this.type === 'direct') {
        return !this.warehouseName
      }
      return this.selectedWarehouseProvider.status !== 'open'
    },
    headers () {
      if (this.warehouseSelected && this.$store.getters.activeOrganization && this.$store.getters.activeOrganization === this.warehouseSelected.warehouseKey) {
        return [
          { text: 'Site name', value: 'siteName', align: 'left', sortable: true },
          { text: 'Address', value: 'address1', align: 'left', sortable: false, width: '25%' },
          { text: 'Address2', value: 'address2', align: 'left', sortable: false },
          { text: 'State', value: 'state', align: 'left', sortable: false },
          { text: 'City', value: 'city', align: 'left', sortable: false, width: '15%' },
          { text: 'Zip', value: 'zip', align: 'left', sortable: false },
          { text: 'Phone', value: 'phone', align: 'left', sortable: false },
          { text: 'Action', value: 'action', align: 'center', sortable: false }
        ]
      } else {
        return [
          { text: 'Site name', value: 'siteName', align: 'left', sortable: false },
          { text: 'Org ID', value: 'orgId', align: 'left', sortable: false },
          { text: 'Address', value: 'address1', align: 'left', sortable: false, width: '25%' },
          { text: 'Address2', value: 'address2', align: 'left', sortable: false },
          { text: 'State', value: 'state', align: 'left', sortable: false },
          { text: 'City', value: 'city', align: 'left', sortable: false, width: '15%' },
          { text: 'Zip', value: 'zip', align: 'left', sortable: false },
          { text: 'Phone', value: 'phone', align: 'left', sortable: false }
        ]
      }
    },
    warehouses () { 
      return this.$store.getters.warehouses
    },
    selectedWarehouseSites () {
      return (this.$store.getters.activeOrganization && this.warehouseSelected) ? 
        ((this.warehouses.find(({warehouseKey}) => warehouseKey === this.warehouseSelected.warehouseKey) || {}).sites || []) :
        this.warehouseSites
    },
    warehousesObj () {
      return this.$store.getters.warehouses.reduce((sum, item) => {
        sum[item.warehouseKey] = item
        return sum
      }, {})
    },
    tenants () {
      return this.$store.getters.tenantWorkFor
    },
    warehouseSites () {
      return this.$store.getters.warehouses.reduce((sum, warehouse) => {
        return [...sum, ...warehouse.sites]
      }, [])
    },
    siteNames () {
      let names = new Set(this.warehouseSelected.sites.map(item => item.siteName))
      names.delete(this.addressInEdit.siteName)
      return names
    },
    requestStatusForTheSelection () {
      return this.signupRequests.find(request => request.warehouseKey === this.selectedWarehouseProvider.warehouseKey)
    },
    selectedWarehouseLimitedInfo () {
      return this.$store.getters
        .warehouseLimitedInfoForTenant
        .find(({key}) => key === this.warehouseSelected.warehouseKey) || {}
    }
  },
  methods: {
    selectData (item) {
      this.sites = item.warehouseSites
    },
    showSignupWarehouseDialog () {
      this.signupWarehouseDialog = true
      this.getAllWarehouses()
    },
    getAllWarehouses () {
      return this.$store.dispatch('getAllWarehouses')
        .then(warehouses => {
          this.warehousesForSignup = warehouses
          this.warehousesForSignup.forEach(item => {
            if (this.signupRequests.some(request => request.warehouseKey === item.warehouseKey)) {
              item.status = 'pending'
            } else if (this.warehousesObj[item.warehouseKey]) {
              item.status = 'approved'
            } else {
              item.status = 'open'
            }
          })
        })
    },
    showAddSiteDialog () {
      this.addAddress = true
      this.addressInEdit = {}
    },
    showEditSiteDialog (item) {
      this.addressInEdit = item
      this.editAddress = true
    },
    dispatchAndToast (promise, actionText) {
      return promise
        .catch(error => {
          return this.$store.dispatch('showToast', {info: `${actionText} failed. ` + error.message})
        })
    },
    addAddressSubmitted (payload) {
      this.dispatchAndToast(this.$store.dispatch('addSelfSiteForTenant', payload), 'Address add')
        .then(() => {
          this.warehouseSelected = this.warehouses.find((warehouse) => {
            return warehouse.warehouseName === 'Others'
          })
        })
    },
    editAddressSubmitted (newAddress, oldAddress) {
      let payload = {newAddress, oldAddress}
      this.dispatchAndToast(this.$store.dispatch('editSelfSiteForTenant', payload), 'Address edit.')
    },
    deleteSite (item) {
      if (confirm('Are you sure to delete this site?')) {
        this.dispatchAndToast(this.$store.dispatch('deleteSelfSiteForTenant', item), 'Address delete.')
      }
    },
    signupWarehouse () {
      return this.$store.dispatch('signupWarehouseWithKey', this.selectedWarehouseProvider)
        .then(request => {
          this.signupRequests.push(request)
        })
    },
    signupWarehouseWithName () {
      return this.$store.dispatch('signupWarehouseWithName', this.warehouseName)
    }
  }
}
</script>
