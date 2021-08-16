<template>
  <div>
    <v-data-table
      :headers="headers"
      :items="upcs"
      :search="filter"
      class="my-1 levation-2 myDense"
      :pagination.sync="pagination"
      select-all
      v-model="selectedUpcs"
      :rows-per-page-items="rowPerPage"
      item-key="upc"
    >
      <template v-slot:items="props">
        <td @click.stop="onClickItem(props)">
          <v-checkbox
            v-if="props.item.unstowedQty || type === 'pickup'"
            :input-value="props.selected"
            primary
            hide-details
          ></v-checkbox>
        </td>
        <td class="subheading">{{ props.item.upc }}</td>
        <td class="text-xs-left">{{ props.item.productName }}</td>
        <td class="text-xs-left" v-if="type === 'stow'">{{ props.item.unstowedQty }} / {{ props.item.totalQty }}</td>
        <td class="text-xs-left" v-else>{{ props.item.totalQty }}</td>
        <td class="text-xs-left">{{ props.item.location && props.item.location.join(', ') }}</td>
        <td class="text-xs-right" v-if="type === 'stow'">
          <v-layout row justify-center align-baseline>
            <v-flex xs3 v-if="props.selected">
              <v-text-field
                class="table-item"
                v-model.number="stowMap[props.item.upc]"
                hide-details
                mask="#####"></v-text-field>
            </v-flex>
            <v-flex xs6><v-btn dark color="primary" flat @click.stop="showEditLocationDialog(props.item)">Edit</v-btn></v-flex>
          </v-layout>
        </td>
      </template>
    </v-data-table>
    <FormSubmitPopup
      title="Edit location"
      v-model="editLocationDialog"
      :rightMethod="editLocation"
      @popupClose="() => { editLocationDialog = false }"
      small
    >
      <template v-slot:input>
        <v-layout>
          <v-flex>
            <v-text-field
              label="UPC"
              class="required_field"
              readonly
              v-model="upcInEdit.upc"></v-text-field>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-combobox
              v-model="upcInEdit.location"
              chips
              multiple
              deletable-chips
              clearable></v-combobox>
          </v-flex>
        </v-layout>
      </template>
    </FormSubmitPopup>
  </div>
</template>

<script>
import { deepEqual } from '@/utils/tools'
import FormSubmitPopup from './FormSubmitPopup'

export default {
  name: 'WarehouseStowTable',
  components: {
    FormSubmitPopup
  },
  data () {
    return {
      headers: this.type === 'stow' ? [
        { text: 'Upc', value: 'upc', align: 'left', sortable: false },
        { text: 'Product name', value: '', align: 'left', sortable: false },
        { text: 'Unstowed / total qty', value: '', align: 'left', sortable: true },
        { text: 'Location', value: 'location', align: 'left', sortable: true },
        { text: '(Stow qty) / Action', value: '', align: 'center', sortable: false, width: '20%' }
      ] : [
        { text: 'Upc', value: 'upc', align: 'left', sortable: false },
        { text: 'Product name', value: '', align: 'left', sortable: false },
        { text: 'Quantity', value: '', align: 'left', sortable: true },
        { text: 'Location', value: 'location', align: 'left', sortable: true }
      ],
      editLocationDialog: false,
      upcInEdit: {},
      initLocation: [],
      rowPerPage: [15, 30, 50, {text: 'All', value: -1}],
      pagination: {
        sortBy: 'upc'
      },
      selectedUpcs: [],
      stowMap: {}
    }
  },
  computed: {
    upcs () {
      return [...this.upcToQtyMap].map(([upc, {totalQty, unstowedQty}]) => {
        return {
          upc,
          productName: this.upcToProductMap[upc] ? this.upcToProductMap[upc].description : 'new product',
          totalQty,
          unstowedQty,
          location: this.upcMap[upc] ? this.upcMap[upc].location : ''
        }
      })
    },
    upcMap () {
      return this.$store.getters.upcMap
    },
    upcToProductMap () {
      return this.$store.getters.upcMap
    }
  },
  watch: {
    upcToQtyMap () {
      this.selectedUpcs = []
      this.stowMap = {}
    },
    selectedUpcs: {
      handler: function (value) {
        value.forEach(item => {
          this.stowMap[item.upc] = this.stowMap[item.upc] === undefined ? item.unstowedQty : this.stowMap[item.upc]
        })
        this.$emit('update:selectedUpcs', value)
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    onClickItem (props) {
      props.selected = !props.selected
      if (props.selected) {
        this.stowMap[props.item.upc] = 0
      }
    },
    showEditLocationDialog (item) {
      this.editLocationDialog = true
      this.upcInEdit = {...item}
      this.initLocation = item.location ? [...item.location] : item.location
    },
    editLocation () {
      if (!deepEqual(this.upcMap[this.upcInEdit.upc].location, this.initLocation)) {
        if (!confirm('The location has already been changed, do you want to overwrite?')) {
          return Promise.resolve('keepPopup')
        } 
      }
      return this.$store.dispatch('updateUpc', {
        key: this.upcMap[this.upcInEdit.upc].key,
        location: this.upcInEdit.location || ''
      })
    },
    changeSort (column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending
      } else {
        this.pagination.sortBy = column
        this.pagination.descending = false
      }
    }
  },
  props: {
    upcToQtyMap: {
      type: Map,
      default: () => {
        return new Map()
      }
    },
    siteKey: String,
    type: String,
    filter: String
  }
}
</script>

<style>
.table-item {
  padding: 0;
  margin: 0;
}
</style>
