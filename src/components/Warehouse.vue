<template>
  <v-container fluid>
    <v-btn fab dark fixed bottom right color="blue" @click="showAddWarehouseDialog" title="Input warehouse">
      <v-icon dark>add</v-icon>
    </v-btn>
    <v-layout justify-space-around>
      <v-flex md10>
        <v-layout>
          <v-flex class="headline mb-3">Warehouse Sites</v-flex>
        </v-layout>
        <v-layout class="subheading">
          <v-flex xs12 md2 lg1 class="text-xs-left mr-2">Name</v-flex>
          <v-flex xs12 md3 lg4 class="text-xs-left mr-2">Address</v-flex>
          <v-flex xs12 md2 lg1 class="text-xs-left">Contact</v-flex>
          <v-flex xs12 md2 lg1 class="text-xs-left">Phone</v-flex>
          <v-flex xs12 md2 class="text-xs-center">Action</v-flex>
        </v-layout>
        <v-divider class="mb-2" ></v-divider>
        <v-layout>
          <v-flex :style="{overflow: 'auto'}">
            <v-layout row wrap align-baseline v-for="item in warehousesSites" :key="item.key">
              <v-flex xs12 md2 lg1 class="text-xs-left mr-2">{{item.name || item.siteName}}</v-flex>
              <v-flex xs12 md3 lg4 class="text-xs-left mr-2"><p style="text-align: left">{{formatAddress(item.address1, item.address2, item.city, item.state, item.zip)}}</p></v-flex>
              <v-flex xs12 md2 lg1 class="text-xs-left"><p style="text-align: left">{{item.contact}}</p></v-flex>
              <v-flex xs12 md2 lg1 class="text-xs-left"><p style="text-align: left">{{item.phone}}</p></v-flex>
              <v-flex xs12 md2 class="text-xs-center">
                <v-layout justify-center>
                  <v-btn dark color="primary" flat  @click.stop="showEditWarehouseDialog(item)">Edit</v-btn>
                  <v-btn dark color="primary" flat  @click.stop="deleteAddressFunc(item)">Delete</v-btn>
                </v-layout>
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
    <EditAddress
      v-model="addAddress"
      v-if="addAddress"
      isWarehouse
      :siteNames="siteNames"
      :actionFunc="addressSubmitted"/>
    <EditAddress
      v-model="editAddress"
      v-if="editAddress"
      :address="addressInEdit"
      isWarehouse
      :editMode="true"
      :siteNames="siteNames"
      :actionFunc="editAddressFunc"
      :checkDistribution="() => $store.dispatch('checkWarehouseDistribution', addressInEdit)"/>
  </v-container>
</template>

<script>

import EditAddress from './EditAddress'
// import { error } from 'util';

export default {
  name: 'warehouses',
  components: {
    EditAddress
  },
  data () {
    return {
      editAddress: false,
      addAddress: false,
      addressInEdit: {},
      valid: true
    }
  },
  computed: {
    warehousesSites () {
      return this.$store.getters.warehousesSites
    },
    activeWarehouse () {
      return this.$store.getters.activeWarehouse
    },
    states () {
      return this.$store.getters.states
    },
    siteNames () {
      let names = new Set(this.warehousesSites.map(item => item.siteName))
      names.delete(this.addressInEdit.siteName)
      return names
    }
  },
  methods: {
    showAddWarehouseDialog () {
      this.addAddress = true
    },
    showEditWarehouseDialog (item) {
      this.editAddress = true
      this.addressInEdit = {...item}
    },
    dispatchAndToast (promise, actionText) {
      promise
        .catch(error => {
          this.$store.dispatch('showToast', {info: `${actionText} failed. ` + error.message})
        })
    },
    addressSubmitted (payload) {
      this.dispatchAndToast(this.$store.dispatch('addWarehouseAddress', payload))
    },
    editAddressFunc (item) {
      this.dispatchAndToast(this.$store.dispatch('editWarehouseAddress', item))
    },
    deleteAddressFunc (item) {
      this.$store.dispatch('getWarehouseInventory', {siteKey: item.key, isAll: true})
        .then(products => {
          if (products.length) return this.$store.dispatch('showToast', {info: 'Only site without inventory can be deleted'})
          if (
            confirm(
              `Would you want to remove this site: \n
              ${item.name || item.siteName} \n
              ${this.formatAddress(item.address1, item.address2, item.city, item.state, item.zip)}`
            )
          ) {
            this.dispatchAndToast(this.$store.dispatch('deleteWarehouseAddress', item))
          }
        })
    },
    formatAddress (address1, address2, city, state, zip) {
      return `${address1} ${address2}, ${city}, ${state} ${zip}`
    }
  }
}
</script>
