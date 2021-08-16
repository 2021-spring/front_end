<template>
  <v-layout column>
    <v-flex>
      <v-layout justify-space-between>
        <v-flex>
          <v-btn dark color="primary" @click.stop="showAddPaymentMethodDialog"><v-icon dark>add</v-icon>Payment method</v-btn>
        </v-flex>
        <v-flex xs4 md2>
          <v-text-field
            append-icon="filter_list"
            label="Search"
            single-line
            hide-details
            v-model="filter"
            @keyup.enter="searchAll"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </v-flex>
    <v-flex>
      <v-layout justify-start align-baseline>
        <v-flex class="success--text caption"><span class="realtime-border px-1">REAL TIME</span></v-flex>
      </v-layout>
      <v-data-table
        :headers="headers"
        :items="paymentMethods"
        class="elevation-2 myDense"
        :search="filter"
        :loading="loading"
        :pagination.sync="pagination"
        :rows-per-page-items="rowPerPage">
        <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>
        <template v-slot:items="props">
          <td class="subheading">{{ props.index + 1 }}</td>
          <td class="text-xs-left">{{ props.item.category}}</td>
          <td class="text-xs-left">{{props.item.displayName}}</td>
          <td class="text-xs-left"><PaymentWidget :value="props.item" :color="'black'"></PaymentWidget></td>
          <td class="text-xs-right">
            <v-layout row>
              <v-flex><v-btn dark color="primary" flat @click.stop="showEditPaymentMethodDialog(props.item)">Edit</v-btn></v-flex>
              <v-flex><v-btn dark color="primary" flat @click.stop="deletePaymentMethod(props.item)">Delete</v-btn></v-flex>
            </v-layout>
          </td>
        </template>
      </v-data-table>
      <PaymentMethodEdit
        title="Edit payment method"
        v-model="editPaymentMethodDialog"
        v-if="editPaymentMethodDialog"
        :paymentMethod="paymentMethodInEdit"
        :paymentMethodIndex="paymentMethodIndex"
        editMode></PaymentMethodEdit>
      <PaymentMethodEdit
        title="Add payment method"
        v-model="addPaymentMethodDialog"
        v-if="addPaymentMethodDialog"
        actionText="Add"
        :paymentMethod="paymentMethodInEdit"
        :paymentMethodIndex="paymentMethodIndex"></PaymentMethodEdit>
    </v-flex>
  </v-layout>
</template>

<script>

import PaymentMethodEdit from './PaymentMethodEdit'
import PaymentWidget from './PaymentWidget'

export default {
  name: 'PaymentMethods',
  components: {
    PaymentMethodEdit,
    PaymentWidget
  },
  data () {
    return {
      addPaymentMethodDialog: false,
      editPaymentMethodDialog: false,
      filter: '',
      headers: [
        { text: 'ID#', value: 'id', align: 'left', sortable: false, width: '5%' },
        { text: 'Category', value: 'category', align: 'left', sortable: false },
        { text: 'Name', value: 'displayName', align: 'left', sortable: false },
        { text: 'Description', value: 'accountHolder', align: 'left', sortable: false },
        { text: 'Action', value: 'filter', align: 'center', sortable: false, width: '8%' }
      ],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      paymentMethodInEdit: {},
      paymentMethodIndex: -1
    }
  },
  computed: {
    paymentMethods () {
      // the map step is just to assign a id to the element so that pagination will work correctly
      return this.$store.getters.paymentMethods.map((item, index) => { return { index, ...item } })
    },
    loading () {
      return this.$store.getters.loading
    }
  },
  mounted () {
    this.$store.dispatch('getPaymentMethod')
  },
  methods: {
    showAddPaymentMethodDialog () {
      this.paymentMethodInEdit = {}
      this.paymentMethodIndex = -1
      this.addPaymentMethodDialog = true
    },
    showEditPaymentMethodDialog (item) {
      this.paymentMethodInEdit = {...item}
      this.paymentMethodIndex = item.index
      this.editPaymentMethodDialog = true
    },
    deletePaymentMethod (item) {
      if (confirm('Are you sure to delete this payment method?')) {
        this.$store.dispatch('deletePaymentMethod', item)
      }
    }
  }
}
</script>
