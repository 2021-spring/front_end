<template>
  <SimpleTextPopup
    :title="title"
    v-model="value"
    @popupClose="$emit('input', false)"
    :hideRgtBtn="true"
    large>
    <template v-slot:input>
      <v-container fluid>
        <v-layout justify-space-between>
          <v-flex xs8 md2 >
            <v-autocomplete
              label="Users"
              :items="users"
              item-text="name"
              item-value="uid"
              v-model="selectedUser"
              Box>
              <template v-slot:item="data">
                <template v-if="typeof data.item !== 'object'">
                  <v-list-tile-content v-text="data.item"></v-list-tile-content>
                </template>
                <template v-else>
                  <v-list-tile-content>
                    <v-list-tile-title>
                      <v-icon v-if="!data.item.uid">supervisor_account</v-icon>
                      <template v-else>
                        <v-icon v-if="data.item.approvalType">perm_identity</v-icon>
                        <v-icon v-else>local_shipping</v-icon>
                      </template>
                      {{data.item.name}}
                    </v-list-tile-title>
                  </v-list-tile-content>
                </template>
              </template>
            </v-autocomplete>
          </v-flex>
          <v-flex xs8 md2>
            <v-text-field
              append-icon="filter_list"
              label="search"
              single-line
              hide-details
              v-model="filter"
            ></v-text-field>
          </v-flex>
        </v-layout>
        <v-data-table
          :headers="headers"
          :items="distribution"
          :search="filter"
          class="levation-2 myDense"
          :pagination.sync="pagination"
          item-key="fbmKey"
          :rows-per-page-items="rowPerPage">
          <template v-slot:items="props">
            <td class="subheading">{{ props.index + 1}}</td>
            <td>
              <ProductWidget
                :name="product.name"
                :condition="product.condition"
                :upc="product.upc"
                :asin="product.asin"
                :sku="props.item.sku"></ProductWidget>
            </td>
            <td class="text-xs-left">{{ props.item.userName }}</td>
            <td class="text-xs-left">{{ props.item.siteName }}</td>
            <td class="text-xs-left">{{ props.item.quantity }}</td>
            <td class="text-xs-right">
              <v-layout row>
                <v-flex>
                  <v-btn 
                    v-if="addedDistributionSet.has(props.item.fbmKey)"
                    color="success" 
                    flat 
                    @click.stop="deleteDistribution(props.item)"
                  >Added</v-btn>
                  <v-btn 
                    v-else
                    color="primary" 
                    flat 
                    @click.stop="addDistribution({...product, ...props.item})"
                  >Add</v-btn>
                </v-flex>
              </v-layout>
            </td>
          </template>
        </v-data-table>
      </v-container>
    </template>
  </SimpleTextPopup>
</template>

<script>
import SimpleTextPopup from './SimpleTextPopup'
import ProductWidget from './ProductWidget'

export default {
  name: 'InventoryDetails',
  components: {
    SimpleTextPopup,
    ProductWidget
  },
  data () {
    return {
      headers: [
        { text: 'ID#', value: 'upc', align: 'left', sortable: false, width: '5%' },
        { text: 'Product', value: 'name', align: 'left', sortable: false },
        { text: 'User', value: 'userName', align: 'left', sortable: false },
        { text: 'Site', value: 'siteName', align: 'left', sortable: false },
        { text: 'Qty', value: 'quantity', align: 'left', sortable: true },
        { text: 'Action', value: 'asinForSearch', align: 'center', sortable: false, width: '8%' }
      ],
      filter: '',
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'id'
      },
      selectedUser: '',
      log: 2
    }
  },
  computed: {
    distribution () {
      let rtn = this.allDistribution
      if (this.product) {
        rtn = rtn.filter((fbm) => fbm.id === this.product.id && (!this.selectedUser || fbm.uid === this.selectedUser))
      }
      return rtn
    },
    users () {
      if (this.hasOnlyWarehouse) {
        return [
          {
            name: '-- All --', 
            uid: ''
          }, 
          ...this.warehouses
        ]
      }
      return [
        {
          name: '-- All --', 
          uid: ''
        }, 
        ...this.warehouses, 
        ...this.$store.getters.users
      ]
    },
    warehouses () {
      if (this.$store.getters.warehouses && this.$store.getters.warehouses.length > 0) {
        return this.$store.getters.warehouses.map(warehouse => { 
          return {
            name: warehouse.warehouseName, 
            uid: warehouse.warehouseKey
          } 
        })
      }
      return []
    }
  },
  methods: {
    deleteDistribution (item) {
      this.$emit('deleteDistribution', item)
      this.$emit('input', false)
    },
    addDistribution (item) {
      this.$emit('addDistribution', item)
      this.$emit('input', false)
    }
  },
  props: {
    value: Boolean,
    title: String,
    product: Object,
    addedDistributionSet: Set,
    hasOnlyWarehouse: Boolean,
    skus: {
      type: Map,
      default: () => {
        return new Map()
      }
    },
    allDistribution: Array
  }
}
</script>
